import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  // Assets referenced from JS (e.g. the Boost.Math `.wasm`) relative to their chunk: the webview
  // serves `dist/` under the extension's path, not at the root
  experimental: {
    renderBuiltUrl: (_, { hostType }) =>
      hostType === 'js' ? { relative: true } : undefined,
  },
  build: {
    // Opt-in (`H5WEB_SOURCEMAP=1`): inline maps triple what the webview loads on startup;
    // external sourcemaps can't be loaded from webviews
    sourcemap: process.env.H5WEB_SOURCEMAP ? 'inline' : false,
    emptyOutDir: true,
    manifest: true, // generate manifest so extension can find output files
    license: true, // list licences of bundled dependencies in `.vite/license.md` (cf. `THIRD_PARTY_NOTICES.md`)
    rollupOptions: {
      // Overwrite default `index.html` entry
      // https://vite.dev/guide/backend-integration.html
      input: 'src/main.tsx',
    },
  },
});
