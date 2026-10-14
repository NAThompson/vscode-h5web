import {
  readFileSync,
  type Stats,
  unwatchFile,
  watchFile,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { type Manifest } from 'vite';
import {
  commands,
  type CustomDocument,
  type CustomReadonlyEditorProvider,
  env,
  type ExtensionContext,
  type LogOutputChannel,
  Uri,
  type Webview,
  type WebviewPanel,
  window,
  workspace,
} from 'vscode';

import { type Message, MessageType } from './models';
import { PLUGINS } from './plugins';
import type RangeServer from './RangeServer';

export default class H5WebViewer implements CustomReadonlyEditorProvider {
  public constructor(
    private readonly context: ExtensionContext,
    private readonly outputChannel: LogOutputChannel,
    private readonly rangeServer: RangeServer,
  ) {}

  public async openCustomDocument(uri: Uri): Promise<CustomDocument> {
    return { uri, dispose: () => {} };
  }

  public async resolveCustomEditor(
    document: CustomDocument,
    webviewPanel: WebviewPanel,
  ): Promise<void> {
    const { webview } = webviewPanel;
    const { extensionUri } = this.context;

    // Allow opening files outside of workspace
    // https://github.com/ucodkr/vscode-tiff/blob/9a4f976584fcba24e9f25680fcdb47fc8f97493f/src/tiffPreview.ts#L27-L30
    const resourceRoot = document.uri.with({
      path: document.uri.path.replace(/\/[^/]+?\.\w+$/u, '/'),
    });

    webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri, resourceRoot],
    };

    /* Read local files lazily via the loopback range server. In remote windows, the
     * server would run on the remote machine, out of the webview's reach, so fall back
     * to fetching the whole file through VS Code's resource loader. */
    const isLazy =
      document.uri.scheme === 'file' && env.remoteName === undefined;
    const rangeOrigin = isLazy ? await this.rangeServer.getOrigin() : undefined;

    let rangeUrl: string | undefined;
    if (isLazy) {
      const [url, unregister] = await this.rangeServer.register(
        document.uri.fsPath,
        basename(document.uri.fsPath),
      );
      rangeUrl = url;
      webviewPanel.onDidDispose(unregister);
    }

    // eslint-disable-next-line require-atomic-updates
    webview.html = await this.getHtmlForWebview(webview, rangeOrigin);

    async function postFileInfo() {
      const { size, mtime } = await workspace.fs.stat(document.uri);
      webview.postMessage({
        type: MessageType.FileInfo,
        data: {
          uri: webview.asWebviewUri(document.uri).toString(),
          rangeUrl,
          name: basename(document.uri.fsPath),
          size,
          mtime,
        },
      } satisfies Message);
    }

    // Reload when file is modified (but not merely accessed, e.g. by range server)
    function onStatChange(curr: Stats, prev: Stats) {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
        void postFileInfo();
      }
    }

    webview.onDidReceiveMessage(async (evt: Message) => {
      if (evt.type === MessageType.Ready) {
        await postFileInfo();

        watchFile(document.uri.fsPath, onStatChange);

        webviewPanel.onDidDispose(() => {
          unwatchFile(document.uri.fsPath, onStatChange); // other editors may still be watching the file
        });

        return;
      }

      if (evt.type === MessageType.Export) {
        const { format, name, payload } = evt.data;

        const defaultUri = Uri.file(
          join(dirname(document.uri.fsPath), `${name}.${format}`),
        );

        const saveUri = await window.showSaveDialog({
          defaultUri,
          title: `Export to ${format.toUpperCase()}`,
        });

        if (saveUri) {
          writeFileSync(saveUri.fsPath, payload);

          // Open output file in separate editor
          commands.executeCommand('workbench.action.keepEditor'); // if current editor is in preview mode, keep it open

          try {
            await window.showTextDocument(saveUri);
          } catch (error) {
            this.outputChannel.warn(
              'Unable to open file:',
              error instanceof Error ? error.message : 'unknown error',
            );
          }
        }
      }
    });
  }

  private async getHtmlForWebview(
    webview: Webview,
    rangeOrigin: string | undefined,
  ): Promise<string> {
    const { extensionPath, extensionUri } = this.context;
    const { cspSource } = webview;

    const manifest = JSON.parse(
      readFileSync(join(extensionPath, 'dist/.vite/manifest.json'), 'utf-8'),
    ) as Manifest;

    // Other entries are lazy-loaded chunks (e.g. wasm64 worker)
    const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
    if (!entry) {
      throw new Error('Expected manifest to include entry chunk');
    }

    const { file: jsPath, css } = entry;
    if (css === undefined) {
      throw new Error('Expected manifest to include `css` files array');
    }

    const [cssPath] = css;
    const jsPathOnDisk = Uri.joinPath(extensionUri, 'dist', jsPath);
    const cssPathOnDisk = Uri.joinPath(extensionUri, 'dist', cssPath);

    const jsUri = webview.asWebviewUri(jsPathOnDisk);
    const cssUri = webview.asWebviewUri(cssPathOnDisk);

    const plugins = JSON.stringify(
      Object.fromEntries(
        Object.entries(PLUGINS).map(([name, relativePath]) => {
          const pluginUri = Uri.joinPath(extensionUri, 'out', relativePath);
          return [name, webview.asWebviewUri(pluginUri).toString()];
        }),
      ),
    );

    const cspRules = [
      "default-src 'none'", // strict by default
      `connect-src ${cspSource} ${rangeOrigin ?? ''}`, // to allow fetching HDF5 file (lazily from range server, or as buffer), and plugins
      `script-src ${cspSource} 'unsafe-eval'`, // 'unsafe-eval' because of cwise dependency in H5Web
      `style-src ${cspSource}`,
      'img-src blob:', // for JPEG/PNG images in Raw visualization
      'worker-src blob:', // for H5WasmLocalFileProvider's inline worker
    ];

    const colorScheme = workspace
      .getConfiguration('h5web')
      .get('colorScheme', 'vscode');

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta
          http-equiv="Content-Security-Policy"
          content="${cspRules.join('; ')};"
        >
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>H5Web</title>
        <script id="plugins" type="application/json">${plugins}</script>
        <script type="module" src="${jsUri.toString()}"></script>
        <link rel="stylesheet" href="${cssUri.toString()}">
			</head>
			<body data-color-scheme=${colorScheme}>
				<div id="root"></div>
			</body>
			</html>`;
  }
}
