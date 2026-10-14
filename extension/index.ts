import { type ExtensionContext, window } from 'vscode';

import H5WebViewer from './H5WebViewer';
import RangeServer from './RangeServer';

// Distinct from upstream extension's, so both can be installed side by side
const EDITOR_IDS = ['h5webFork.viewer', 'h5webFork.fallback-viewer'];

export function activate(context: ExtensionContext): void {
  const outputChannel = window.createOutputChannel('H5Web (fork)', {
    log: true,
  });
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
