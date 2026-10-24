import { useEventListener } from '@react-hookz/web';
import { startTransition, Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { clear } from 'suspend-react';

import { type FileInfo, type Message, MessageType } from '../extension/models';
import styles from './App.module.css';
import ErrorFallback from './ErrorFallback';
import StandaloneViewer from './StandaloneViewer';
import { shouldUseWasm64 } from './utils';
import Viewer from './Viewer';
import { vscode } from './vscode-api';

// 2 GB = 2 * 1024 * 1024 * 1024 B
const MAX_SIZE_IN_BYTES = 2_147_483_648;

function App() {
  const [fileInfo, setFileInfo] = useState<FileInfo>();

  useEventListener(globalThis, 'message', (evt: MessageEvent<Message>) => {
    const { data: message } = evt;
    if (message.type === MessageType.FileInfo) {
      // Keep showing the current file until the reloaded one is ready (e.g. SWMR file updating live)
      startTransition(() => setFileInfo(message.data));
    }
  });

  useEffect(() => {
    vscode.postMessage({ type: MessageType.Ready });
  }, []);

  if (!fileInfo) {
    return null;
  }

  if (!fileInfo.exists) {
    return (
      <div className={styles.missing}>
        <p>File was deleted or moved</p>
        <p>It will reload automatically if it is restored.</p>
      </div>
    );
  }

  if (fileInfo.size === 0) {
    // e.g. when comparing git changes on an untracked file - https://github.com/silx-kit/vscode-h5web/issues/22
    return <p>File does not exist</p>;
  }

  /* Configured color scheme is passed to webview via `data-color-scheme` attribute.
   * If "system", let H5Web's default behaviour kick in (i.e. `prefer-color-scheme: dark`).
   * Otherwise, take over control of the color scheme with CSS. */
  const { colorScheme } = document.body.dataset;
  const disableDarkMode = colorScheme !== 'system';

  // Files read lazily have no size limit
  if (!fileInfo.rangeUrl && fileInfo.size >= MAX_SIZE_IN_BYTES) {
    return (
      <StandaloneViewer
        disableDarkMode={disableDarkMode}
        wasm64={shouldUseWasm64(fileInfo.wasm64)}
        customMessage={
          <p>
            File is too large to be opened from the explorer (max 2 GB). Please
            browse for it from here:
          </p>
        }
      />
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[fileInfo]}
      onError={() => {
        clear([fileInfo]); // clear suspend cache
      }}
    >
      <Suspense fallback={<p className={styles.loading}>Loading...</p>}>
        <Viewer fileInfo={fileInfo} disableDarkMode={disableDarkMode} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
