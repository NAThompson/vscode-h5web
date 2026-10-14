# Contributing

## Getting started

```bash
pnpm install
pnpm build:app
pnpm watch
```

- `pnpm build:app` builds the front-end app (i.e. the H5Web viewer) with
  [Vite](https://vitejs.dev/).
- `pnpm watch` compiles the extension code with `tsc` in watch mode.

Once watch mode is running, press <kbd>F5</kbd> to **run the extension in debug
mode** in a new VS Code window. If this doesn't work, check that the
[_JavaScript Debugger_](https://marketplace.visualstudio.com/items?itemName=ms-vscode.js-debug)
extension is enabled.

Whenever you change the code of the front-end app, run `pnpm build:app` again in
a separate terminal, wait for Vite to finish building the app, and reload the VS
Code window where the extension is running with <kbd>Ctrl+R</kbd>.

## How it works

1. When the user opens an HDF5 file, a new
   [webview editor](https://code.visualstudio.com/api/extension-guides/custom-editors)
   opens up.
2. The [webview](https://code.visualstudio.com/api/extension-guides/webview) is
   initialised with an HTML document that references the compiled front-end
   assets located in the `dist` directory.
3. VS Code loads the webview, which kicks off the H5Web viewer.
4. Once the `App` component is mounted, it notifies the extension that the
   viewer is ready using VS Code's
   [`postMessage` API](https://code.visualstudio.com/api/extension-guides/webview#scripts-and-message-passing).
5. The extension then sends the name of the HDF5 file opened by the user to the
   viewer, with the URL at which its range server (`RangeServer.ts`) serves the
   file on the loopback interface (local files only).
6. The viewer passes that URL to H5Web's `H5WasmRemoteFileProvider`, whose
   worker reads the file lazily with synchronous range requests (only the parts
   needed to display what's selected), and renders H5Web's `App` component.
   Requests are made to `h5web.localhost`, which Chromium resolves to the
   loopback interface and which, unlike `localhost`, is not intercepted by the
   webview's service worker.
7. In remote windows, or if the range server can't start, the viewer fetches the
   whole file with its webview URI and passes the buffer to
   `H5WasmBufferProvider` instead. If the file is larger than 2 GB, the `App`
   component renders a fallback `StandaloneViewer`, which offers to the user to
   browse for the file from inside the webview (`H5WasmLocalFileProvider`).

## Code quality

- `pnpm lint` - run all linting and code formatting commands
- `pnpm lint:eslint` - lint all TS and JS files with ESLint
- `pnpm lint:eslint --fix` - auto-fix linting issues
- `pnpm lint:prettier` - check that all files have been formatted with Prettier
- `pnpm lint:prettier --write` - format all files with Prettier

## Publishing

This fork must **not** be published to the Visual Studio Marketplace or the Open
VSX Registry: the `pub` and `pub:ovsx` scripts exit with an error, and
`package.json` is marked `"private"`. Package it as a `.vsix` instead (see
"Building the fork" in the README).
