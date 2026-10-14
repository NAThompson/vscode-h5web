import { type ExtensionContext, window } from 'vscode';

import H5WebViewer from './H5WebViewer';
import RangeServer from './RangeServer';

const EDITOR_IDS = ['h5web.viewer', 'h5web.fallback-viewer'];

export function activate(context: ExtensionContext): void {
  const outputChannel = window.createOutputChannel('H5Web', { log: true });
  const rangeServer = new RangeServer();

  context.subscriptions.push(
    rangeServer,
    ...EDITOR_IDS.map((id) =>
      window.registerCustomEditorProvider(
        id,
        new H5WebViewer(context, outputChannel, rangeServer),
        {
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: true,
        },
      ),
    ),
  );
}
