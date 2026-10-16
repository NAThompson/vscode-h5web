#!/usr/bin/env node
/* Generate `THIRD_PARTY_NOTICES.md` (shipped in the .vsix) from:
 * - `third-party/components.json` + `third-party/licenses/`: native/WebAssembly components
 *   (h5wasm, HDF5, compression libraries...) and JS code not seen by Vite (inline worker, CSS),
 *   with licence texts copied from their source trees;
 * - `dist/.vite/license.md`: JS dependencies bundled by Vite (run `pnpm build:app` first).
 * Fails if a licence that isn't known to be permissive is found. */
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8'); // eslint-disable-line func-style

const PERMISSIVE =
  /^(?:MIT|ISC|Apache-2\.0|0BSD|BSD-[23]-Clause|Zlib|BlueOak-1\.0\.0|Unlicense|CC0-1\.0)$/u;

const components = JSON.parse(read('third-party/components.json'));
const viteLicenses = read('dist/.vite/license.md');

// Vite headings: `## <name> - <version> (<licence>)`
const jsPackages = [
  ...viteLicenses.matchAll(/^## (.+) - (\S+) \((.+)\)$/gmu),
].map(([, name, version, license]) => ({ name, version, license }));

const flagged = [
  ...jsPackages
    .filter(({ license }) => !PERMISSIVE.test(license))
    .map(({ name, license }) => `${name} (${license})`),
  ...components
    .filter(({ note }) => note)
    .map(({ name, note }) => `${name}: ${note}`),
];

// SPDX expression (e.g. `(MIT AND Zlib)`, `(MPL-2.0 OR Apache-2.0)`): some option must be all permissive
function isPermissive(license) {
  return license
    .replace(/^\((.*)\)$/u, '$1')
    .split(' OR ')
    .some((option) => option.split(' AND ').every((id) => PERMISSIVE.test(id)));
}

const unknown = jsPackages.filter(({ license }) => !isPermissive(license));
if (unknown.length > 0) {
  console.error('Licences not known to be permissive:', unknown);
  process.exitCode = 1;
}

const lines = [
  '# Third-party notices',
  '',
  'H5Web (fork) for VS Code is distributed under the MIT licence (see `LICENSE.md`).',
  'It bundles the third-party software listed below, whose copyright notices and',
  'licence terms are reproduced here. All of it is under permissive licences; where a',
  'component is dual-licensed, the permissive option is used (see notes).',
  '',
  'This software is based in part on the work of the Independent JPEG Group',
  '(JPEG compression plugin).',
  '',
  '## Summary',
  '',
  '### Native / WebAssembly components and other bundled code',
  '',
  '| Component | Version | Used in | Licence |',
  '| --- | --- | --- | --- |',
  ...components.map(
    ({ name, version, usedIn, license }) =>
      `| ${name} | ${version} | ${usedIn} | ${license} |`,
  ),
  '',
  '### JavaScript dependencies bundled in the webview',
  '',
  '| Package | Version | Licence |',
  '| --- | --- | --- |',
  ...jsPackages.map(
    ({ name, version, license }) => `| ${name} | ${version} | ${license} |`,
  ),
  '',
];

if (flagged.length > 0) {
  lines.push('### Notes', '', ...flagged.map((item) => `- ${item}`), '');
}

lines.push('## Licence texts: native / WebAssembly components', '');
for (const { name, version, files } of components) {
  for (const { label, file, origin } of files) {
    lines.push(
      `### ${name} ${version} — ${label}`,
      '',
      `Source: \`${origin}\``,
      '',
      '```text',
      read(path.join('third-party', file)).trimEnd(),
      '```',
      '',
    );
  }
}

lines.push(
  '## Licence texts: JavaScript dependencies',
  '',
  viteLicenses
    .replace(/^# Licenses\n+.*\n+/u, '') // drop Vite's own title and intro
    .replaceAll(/^## /gmu, '### ')
    .trimEnd(),
  '',
);

writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), lines.join('\n'));
console.log(
  `THIRD_PARTY_NOTICES.md: ${components.length} components, ${jsPackages.length} JS packages`,
);
for (const item of flagged) {
  console.log(`note: ${item}`);
}
