import { App } from '@h5web/app';
import { H5WasmLocalFileProvider } from '@h5web/h5wasm';
import { type ReactNode, useState } from 'react';

import { getExportURL, getPluginGetter } from './utils';

interface Props {
  disableDarkMode: boolean;
  wasm64: boolean;
  customMessage?: ReactNode;
}

function StandaloneViewer(props: Props) {
  const { disableDarkMode, wasm64, customMessage } = props;
  const [fallbackFile, setFallbackFile] = useState<File>();

  if (!fallbackFile) {
    return (
      <>
        {customMessage}
        <input
          type="file"
          aria-label="Select file"
          onChange={(evt) => setFallbackFile(evt.target.files?.[0])}
        />
      </>
    );
  }

  return (
    <H5WasmLocalFileProvider
      file={fallbackFile}
      getExportURL={getExportURL}
      getPlugin={getPluginGetter(wasm64)}
      wasm64={wasm64}
    >
      <App disableDarkMode={disableDarkMode} />
    </H5WasmLocalFileProvider>
  );
}

export default StandaloneViewer;
