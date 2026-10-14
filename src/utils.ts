import {
  assertNonNull,
  type BuiltInExporter,
  type Dataset,
  type ExportFormat,
  type ExportURL,
} from '@h5web/app';
import { type Plugin } from '@h5web/h5wasm';

import { MessageType } from '../extension/models.js';
import { vscode } from './vscode-api.js';

const pluginsScriptElem = document.getElementById('plugins');
assertNonNull(pluginsScriptElem);

const PLUGINS = JSON.parse(pluginsScriptElem.innerHTML) as Record<
  'wasm32' | 'wasm64',
  Record<Plugin, string>
>;

// Minimal module declaring a 64-bit memory (Memory64), e.g. unsupported before Chromium 133
const MEMORY64_MODULE = new Uint8Array([
  0x00,
  0x61,
  0x73,
  0x6d,
  0x01,
  0x00,
  0x00,
  0x00, // magic, version
  0x05,
  0x03,
  0x01,
  0x04,
  0x01, // memory section: 1 memory, i64 flag, min 1 page
]);

export const isMemory64Supported = WebAssembly.validate(MEMORY64_MODULE);

function createPluginGetter(
  wasm64: boolean,
): (name: Plugin) => Promise<ArrayBuffer | undefined> {
  const plugins = PLUGINS[wasm64 ? 'wasm64' : 'wasm32'];

  return async (name) => {
    const url = plugins[name];

    if (!url) {
      return undefined;
    }

    const response = await fetch(url);
    return response.arrayBuffer();
  };
}

const getPlugin32 = createPluginGetter(false);
const getPlugin64 = createPluginGetter(true);

/* Plugins must match build of h5wasm in use (wasm64 or wasm32) */
export function getPluginGetter(
  wasm64: boolean,
): (name: Plugin) => Promise<ArrayBuffer | undefined> {
  return wasm64 ? getPlugin64 : getPlugin32;
}

/* Use wasm64 build of h5wasm if enabled and supported by webview, otherwise wasm32 */
export function shouldUseWasm64(enabled: boolean): boolean {
  return enabled && isMemory64Supported;
}

export function getExportURL(
  format: ExportFormat,
  dataset: Dataset,
  _selection?: string,
  builtInExporter?: BuiltInExporter,
): ExportURL | undefined {
  if (!builtInExporter) {
    return undefined;
  }

  return async () => {
    const payload = builtInExporter();

    // Send payload to `H5WebViewer` editor provider
    vscode.postMessage({
      type: MessageType.Export,
      data: { format, name: dataset.name, payload },
    });

    return new Blob(); // doesn't matter as long as it's not falsy
  };
}

export class FetchError extends Error {
  public constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super();
    this.name = 'FetchError';
  }
}
