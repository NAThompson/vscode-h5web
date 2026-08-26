import { App } from '@h5web/app';
import { H5WasmBufferProvider } from '@h5web/h5wasm';
import { useEffect } from 'react';
import { clear, suspend } from 'suspend-react';

import { type FileInfo } from '../extension/models.js';
import { getExportURL, getPlugin } from './utils';

interface Props {
  fileInfo: FileInfo;
}

function Viewer(props: Props) {
  const { fileInfo } = props;

  const buffer = suspend(async () => {
    const res = await fetch(fileInfo.uri);

    if (!res.ok) {
      // Notably when the file has been deleted since it was last stat'd
      throw new Error(`Unable to read file (${res.status} ${res.statusText})`);
    }

    return res.arrayBuffer();
  }, [fileInfo]);

  // `suspend` caches every buffer it has ever fetched, so release this one as
  // soon as the file changes -- otherwise reloading retains a copy of every
  // version of the file
  useEffect(() => () => clear([fileInfo]), [fileInfo]);

  return (
    <H5WasmBufferProvider
      filename={fileInfo.name}
      buffer={buffer}
      getExportURL={getExportURL}
      getPlugin={getPlugin}
    >
      <App />
    </H5WasmBufferProvider>
  );
}

export default Viewer;
