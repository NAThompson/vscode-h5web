# [H5Web](https://h5web.panosc.eu/) for Visual Studio Code — personal fork

> **This is a personal fork of
> [silx-kit/vscode-h5web](https://github.com/silx-kit/vscode-h5web), for local
> `.vsix` installs only. It is not, and must never be, published to the VS Code
> Marketplace or Open VSX** (the `pub` scripts refuse to run).
>
> ```bash
> code --install-extension h5web-fork-<sha>.vsix
> ```
>
> Differences from upstream:
>
> - Local files are read lazily (only what is displayed), so files of any size
>   open quickly, straight from the Explorer.
> - Uses the 64-bit (Memory64) build of HDF5 2.0 when the webview supports it
>   (falls back to 32-bit otherwise; see `h5webFork.wasm64`).
> - Editors and settings use the `h5webFork.*` prefix, so the fork can be
>   installed alongside the upstream extension.
> - Built against forked H5Web, h5wasm and h5wasm-plugins (see
>   [Building the fork](#building-the-fork)).

Explore and visualise **HDF5 files** directly in Visual Studio Code with
[H5Web](https://h5web.panosc.eu/) and its `H5WasmProvider`.

![GIF recording](./assets/vscode-h5web.gif)

## View hints: choosing how a dataset opens

Native HDF5 attributes named `H5WEB_*` tell the viewer which visualization to
open and how to set it up (scale, colormap, isosurfaces, overlays, playback…).
Write them when you create the file:

```python
f["psi"].attrs.update({"H5WEB_vis": "heatmap", "H5WEB_scale": "symlog",
                       "H5WEB_colormap": "auto", "H5WEB_keep_ratio": 1})
f["density"].attrs.update({"H5WEB_vis": "volume", "H5WEB_iso_levels": [0.5]})
```

The full list of attributes is in
[docs/view-hints.md](https://github.com/NAThompson/h5web/blob/fork/docs/view-hints.md)
in the H5Web fork. The installed extension also ships it as `VIEW_HINTS.md` in
its folder (`~/.vscode/extensions/nathompson.vscode-h5web-<version>/`), matching
the viewer version.

## Supported HDF5 file extensions

Out of the box, the H5Web viewer is configured as the default editor for the
following file extensions: `.h5`, `.hdf`, `.hdf5`, `hf5`, `.nx`
([NeXus](https://manual.nexusformat.org/index.html)), `.nxs`, `.nx5`, `.nexus`,
`.cxi`
([Coherent X-ray Imaging](https://raw.githubusercontent.com/cxidb/CXI/master/cxi_file_format.pdf)),
`.nc` ([netCDF4](https://docs.unidata.ucar.edu/nug/current/)), `.nc4`,
[`.loom`](http://linnarssonlab.org/loompy/format/),
[`.jld2`](https://github.com/JuliaIO/JLD2.jl),
[`.h5ebsd`](https://link.springer.com/article/10.1186/2193-9772-3-4), `.edaxh5`,
`.oh5`,
[`.dream3d`](https://dream3d.bluequartz.net/Help/3_SupportedFileFormats/Native_DREAM3D_File_Format/),
[`.geoh5`](https://mirageoscience-geoh5py.readthedocs-hosted.com/en/v0.8.0/content/geoh5_format/index.html),
[`.h5oina`](https://github.com/oinanoanalysis/h5oina),
[`.h5ad`](https://anndata.readthedocs.io/en/latest/index.html),
[`.nde`](https://ndeformat.com/latest/),
[`.vtkhdf`](https://docs.vtk.org/en/latest/design_documents/VTKFileFormats.html#vtkhdf-file-format).

To add more extensions, don't hesitate to
[open an issue](https://github.com/silx-kit/vscode-h5web/issues/new) or
[a pull request](https://github.com/silx-kit/vscode-h5web/pulls). Alternatively,
you can use VS Code's `workbench.editorAssociations` setting to set H5Web as the
default editor for additional extensions:

```json
"workbench.editorAssociations": {
  "*.foo": "h5webFork.viewer",
},
```

You can also open any file in H5Web with **right click -> Open with... -> H5Web
(fork, any extension)**, or, if you've already opened the file, by
[switching editor type](https://code.visualstudio.com/updates/v1_132#_switch-editor-types)
(VS Code 1.132+) or invoking **View: Reopen Editor With...** from the command
palette:

![GIF recording](./assets/vscode-openwith.gif)

Note that some of the extensions configured to open with H5Web are not
guaranteed to map to HDF5 files. For instance, the `.nc` extension is also used
for netCDF3 files, which are **not** based on HDF5 and are therefore not
compatible with H5Web. If this is an issue, you can use the
`workbench.editorAssociations` to restore the default editor association as
follows:

```json
"workbench.editorAssociations": {
  "*.nc": "default",
},
```

## Supported HDF5 compression plugins

The extension supports reading datasets compressed with any of the plugins
available in
[h5wasm-plugins@0.2.1](https://github.com/h5wasm/h5wasm-plugins/tree/v0.2.1?tab=readme-ov-file#included-plugins).

## Known limitations

This extension uses [h5wasm](https://github.com/usnistgov/h5wasm) to read HDF5
files and therefore suffers from the following limitations:

### Slices larger than about 2 GB cannot be displayed

VS Code's Electron runtime cannot allocate a single buffer larger than about 2
GB, so a slice (or dataset) larger than that cannot be loaded, even with the
64-bit build of HDF5. Select a smaller slice instead (e.g. with a visualization
that maps fewer dimensions).

In remote windows (SSH, WSL, containers), files are fetched whole, so files
larger than 2 GB must be browsed for from inside the editor.

### External links cannot be resolved

This is a limitation of [h5wasm](https://github.com/usnistgov/h5wasm) that the
extension uses to read HDF5 files.

### Incompatiblity with `snap` packages and Wayland on Linux

When using the extension to view datasets with a VS Code instance installed from
`snap`, you may encounter an error **Error creating WebGL context**.

This is an issue from VSCode `snap` package that
[forces the use of `XWayland/X11` instead of `Wayland`](https://github.com/microsoft/vscode/issues/207033).
Since it can not be worked around, our advice is use another VSCode installation
instead (e.g. via `apt`).

## Configuration

### `h5webFork.colorScheme`

Specifies whether to use a light or dark color scheme. By default, H5Web follows
VS Code's theme.

> After changing this setting, please reopen your H5Web editors for the new
> color scheme to take effect.

### `h5webFork.wasm64`

Use the 64-bit (Memory64) build of HDF5 when the webview supports it (default),
which can read larger slices than the 32-bit build. Turn it off to force the
32-bit build. Without Memory64 support, the 32-bit build is always used.

## Building the fork

The forked dependencies are referenced as tarballs in `vendor/`, which are not
committed. Download them (with SHA-256 verification) before installing:

```bash
node scripts/fetch-vendor.mjs # download vendor/*.tgz from GitHub releases
pnpm install
pnpm --allow-build=@vscode/vsce-sign --allow-build=keytar dlx @vscode/vsce package --no-dependencies -o h5web-fork-$(git rev-parse --short HEAD).vsix
code --install-extension h5web-fork-<sha>.vsix
```

- `vendor/SHA256SUMS` lists the expected tarballs and their SHA-256
  (`cd vendor && shasum -a 256 -c SHA256SUMS`).
- `vendor/SOURCES` gives the URL of each tarball (GitHub release assets of
  [NAThompson/h5web](https://github.com/NAThompson/h5web) branch `fork-vscode`,
  [NAThompson/h5wasm](https://github.com/NAThompson/h5wasm) and
  [NAThompson/h5wasm-plugins](https://github.com/NAThompson/h5wasm-plugins)).

To switch to a published release, replace the `file:vendor/...` specs in
`package.json` (dependencies) and `pnpm-workspace.yaml` (overrides) with the
release asset URLs.
