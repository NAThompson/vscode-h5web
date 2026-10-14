import { App } from '@h5web/app';
import { H5WasmRemoteFileProvider } from '@h5web/h5wasm';

import { type FileInfo } from '../extension/models.js';
import BufferViewer from './BufferViewer';
import { getExportURL, getPluginGetter, shouldUseWasm64 } from './utils';
import WidthGuard from './WidthGuard.js';

interface Props {
  fileInfo: FileInfo;
  disableDarkMode: boolean;
}

function Viewer(props: Props) {
  const { fileInfo, disableDarkMode } = props;
  const wasm64 = shouldUseWasm64(fileInfo.wasm64);

  const app = (
    <WidthGuard>
      <App disableDarkMode={disableDarkMode} />
    </WidthGuard>
  );

  if (fileInfo.rangeUrl) {
    // Read file lazily from extension's range server
    return (
      <H5WasmRemoteFileProvider
        url={fileInfo.rangeUrl}
        filename={fileInfo.name}
        resetKeys={[fileInfo]}
        getExportURL={getExportURL}
        getPlugin={getPluginGetter(wasm64)}
        wasm64={wasm64}
      >
        {app}
      </H5WasmRemoteFileProvider>
    );
  }

  return <BufferViewer fileInfo={fileInfo}>{app}</BufferViewer>;
}

export default Viewer;
