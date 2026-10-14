import { H5WasmBufferProvider } from '@h5web/h5wasm';
import { type PropsWithChildren } from 'react';
import { suspend } from 'suspend-react';

import { type FileInfo } from '../extension/models.js';
import {
  FetchError,
  getExportURL,
  getPluginGetter,
  shouldUseWasm64,
} from './utils';

interface Props {
  fileInfo: FileInfo;
}

/* Fallback for files that can't be read lazily (e.g. remote windows, other URI schemes) */
function BufferViewer(props: PropsWithChildren<Props>) {
  const { fileInfo, children } = props;
  const wasm64 = shouldUseWasm64(fileInfo.wasm64);

  const buffer = suspend(async () => {
    // Make a range request so that VS Code's webview service worker doesn't keep a copy of it
    // https://github.com/microsoft/vscode/blob/a585a29d941f79bc3c6bde782ad68997cd99a3c4/src/vs/workbench/contrib/webview/browser/pre/service-worker.js#L443
    const res = await fetch(fileInfo.uri, { headers: { Range: 'bytes=0-' } });

    if (!res.ok) {
      throw new FetchError(res.status, res.statusText);
    }

    return res.arrayBuffer();
  }, [fileInfo]);

  return (
    <H5WasmBufferProvider
      filename={fileInfo.name}
      buffer={buffer}
      getExportURL={getExportURL}
      getPlugin={getPluginGetter(wasm64)}
      wasm64={wasm64}
    >
      {children}
    </H5WasmBufferProvider>
  );
}

export default BufferViewer;
