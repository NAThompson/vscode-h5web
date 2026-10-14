import { randomBytes } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { type AddressInfo } from 'node:net';

/* Webviews can't give the H5Web worker synchronous access to the file:
 * - requests made from a worker to `asWebviewUri` URLs never reach VS Code's resource
 *   loader (the webview's service worker can't tell which webview a worker belongs to,
 *   so the request times out after 30s);
 * - `SharedArrayBuffer` requires cross-origin isolation, which VS Code only enables
 *   with `--enable-coi`.
 *
 * So we serve local files over HTTP on the loopback interface, with range requests,
 * and let h5wasm read them lazily with synchronous XHR from its worker. The webview
 * reaches the server via a `*.localhost` host name: Chromium resolves it to the
 * loopback interface, and unlike `localhost` or `127.0.0.1`, it isn't intercepted by
 * the webview's service worker. Each file is only reachable via an unguessable token. */

export const HOSTNAME = 'h5web.localhost';

interface Entry {
  fsPath: string;
}

export default class RangeServer {
  private server: Server | undefined;
  private port: Promise<number> | undefined;
  private readonly entries = new Map<string, Entry>();

  public async getOrigin(): Promise<string> {
    return `http://${HOSTNAME}:${await this.start()}`;
  }

  /* Returns the URL at which the file is served, and a function to stop serving it */
  public async register(
    fsPath: string,
    fileName: string,
  ): Promise<[string, () => void]> {
    const origin = await this.getOrigin();
    const token = randomBytes(16).toString('hex');
    this.entries.set(token, { fsPath });

    return [
      `${origin}/${token}/${encodeURIComponent(fileName)}`,
      () => this.entries.delete(token),
    ];
  }

  public dispose(): void {
    this.entries.clear();
    this.server?.close();
    this.server = undefined;
    this.port = undefined;
  }

  private async start(): Promise<number> {
    if (!this.port) {
      this.port = new Promise((resolve, reject) => {
        const server = createServer((req, res) => this.handle(req, res));
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
          resolve((server.address() as AddressInfo).port);
        });
        this.server = server;
      });
    }

    return this.port;
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const { origin } = req.headers;

    // Only serve webviews (requests from the webview's worker are cross-origin, so always include `Origin`)
    if (!origin?.startsWith('vscode-webview://')) {
      res.writeHead(403).end();
      return;
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, ETag, Last-Modified',
      'Access-Control-Allow-Private-Network': 'true',
      Vary: 'Origin',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders).end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, corsHeaders).end();
      return;
    }

    const [, token] = (req.url ?? '').split('/');
    const entry = token ? this.entries.get(token) : undefined;
    if (!entry) {
      res.writeHead(404, corsHeaders).end();
      return;
    }

    let size: number;
    let mtimeMs: number;
    try {
      ({ size, mtimeMs } = statSync(entry.fsPath));
    } catch {
      res.writeHead(404, corsHeaders).end();
      return;
    }

    const headers = {
      ...corsHeaders,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/octet-stream',
      ETag: `"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`,
      'Last-Modified': new Date(mtimeMs).toUTCString(),
    };

    const range = parseRange(req.headers.range, size);

    if (range === null) {
      res
        .writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` })
        .end();
      return;
    }

    const [start, end] = range ?? [0, size - 1];
    const length = Math.max(end - start + 1, 0);

    res.writeHead(range ? 206 : 200, {
      ...headers,
      'Content-Length': length,
      ...(range && { 'Content-Range': `bytes ${start}-${end}/${size}` }),
    });

    if (req.method === 'HEAD' || length === 0) {
      res.end();
      return;
    }

    const stream = createReadStream(entry.fsPath, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }
}

/* Returns `undefined` if there's no range, `null` if it's not satisfiable */
function parseRange(
  header: string | undefined,
  size: number,
): [number, number] | undefined | null {
  if (!header) {
    return undefined;
  }

  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (!match || (!match[1] && !match[2])) {
    return undefined; // ignore multi-range and malformed headers
  }

  const [, first, last] = match;

  if (!first) {
    // Suffix range, e.g. `bytes=-500` for the last 500 bytes
    const suffix = Number(last);
    return suffix > 0 && size > 0
      ? [Math.max(size - suffix, 0), size - 1]
      : null;
  }

  const start = Number(first);
  const end = last ? Math.min(Number(last), size - 1) : size - 1;
  return start < size && start <= end ? [start, end] : null;
}
