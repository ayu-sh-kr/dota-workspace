import {createReadStream} from 'node:fs';
import {readFileSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer, type Server} from 'node:http';
import {extname, resolve, sep} from 'node:path';
import type {AddressInfo} from 'node:net';
import {createDotaLogger} from '@ayu-sh-kr/dota-common-utils';
import {toNodeListener} from './node-listener';
import type {RequestHandler} from './types';

/** Options for {@link createNodeServer}. */
export interface NodeServerOptions {
  /** Answers `ssr` routes; resolves `undefined` for everything else. */
  readonly handler: RequestHandler;
  /** Built client directory (Vite's `outDir`), including prerendered `ssg` pages. */
  readonly clientDirectory: string;
  /** Shell served for unmatched paths so `csr` routes boot in the browser; defaults to `index.html`. */
  readonly fallback?: string;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.map': 'application/json'
};
const logger = createDotaLogger('dota-ssr', 'ssr/node-server.ts');

/**
 * HTTP server for a built Dota application, covering all three render modes:
 * a built file (assets and prerendered `ssg` pages, including `/path/index.html`) wins,
 * with `/path` redirected (308) to `/path/` for a directory index and `/path/` to `/path` for `path.html`,
 * as static hosts do,
 * then `ssr` routes are rendered per request, then the SPA shell answers so `csr` routes
 * start in the browser. A client `index.html` identical to the fallback shell is never served
 * as a page, so a server-rendered `/` is not shadowed. A render error is logged and answered with 500, never the shell,
 * so failures stay visible. Paths never resolve outside `clientDirectory`.
 * @returns An unstarted `http.Server`; call `listen()`.
 */
export function createNodeServer(options: NodeServerOptions): Server {
  const root = resolve(options.clientDirectory);
  const fallback = resolve(root, options.fallback ?? 'index.html');
  const render = toNodeListener(options.handler);
  // A client `index.html` that is still the unrendered shell is not a page: serving it would
  // shadow a server-rendered `/`. A prerendered home page differs from the shell and is served.
  const shell = readFileSync(fallback, 'utf8');
  const unrenderedIndex = resolve(root, 'index.html');
  const isShell = (file: string) => file === unrenderedIndex && file !== fallback && readFileSync(file, 'utf8') === shell;
  const shellIndex = isShell(unrenderedIndex) ? unrenderedIndex : undefined;

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const found = request.method === 'GET' || request.method === 'HEAD' ? await findFile(root, pathname) : undefined;
      const file = found === shellIndex ? undefined : found;
      if (file && !pathname.endsWith('/') && file === resolve(root, `.${pathname}`, 'index.html')) {
        return void response.writeHead(308, {location: `${url.pathname}/${url.search}`}).end();
      }
      if (file && pathname.length > 1 && pathname.endsWith('/') && file === `${resolve(root, `.${pathname}`)}.html`) {
        return void response.writeHead(308, {location: `${url.pathname.replace(/\/+$/, '')}${url.search}`}).end();
      }
      if (file) return sendFile(file, request.method === 'HEAD', response);
      await render(request, response, (error?: unknown) => {
        if (error) {
          logger.error(`Render failed for ${request.url ?? '/'}`, error);
          return void response.writeHead(500, {'content-type': 'text/plain; charset=utf-8'}).end('Internal Server Error');
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') return void response.writeHead(405).end();
        sendFile(fallback, request.method === 'HEAD', response);
      });
    } catch {
      if (!response.headersSent) response.writeHead(400).end();
    }
  });
  server.on('listening', () => {
    logger.info(`SSR server listening on ${listeningUrl(server.address())}`);
    logger.debug(`Serving client files from ${root} with fallback ${fallback}`);
  });
  return server;
}

/** The first existing file for a path: itself, `<path>/index.html`, then `<path>.html`. */
async function findFile(root: string, pathname: string): Promise<string | undefined> {
  const base = resolve(root, `.${pathname}`);
  if (base !== root && !base.startsWith(root + sep)) return undefined;
  for (const candidate of [base, resolve(base, 'index.html'), `${base}.html`]) {
    const info = await stat(candidate).catch(() => undefined);
    if (info?.isFile()) return candidate;
  }
  return undefined;
}

function sendFile(file: string, headOnly: boolean, response: import('node:http').ServerResponse): void {
  response.writeHead(200, {'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'});
  if (headOnly) response.end();
  else createReadStream(file).on('error', () => response.destroy()).pipe(response);
}

/**
 * Formats a listening address as a URL a terminal can open; wildcard hosts become `localhost`.
 * @param address Value of `server.address()`: a TCP address, a pipe path, or `null`.
 */
export function listeningUrl(address: AddressInfo | string | null): string {
  if (!address || typeof address === 'string') return address ?? 'an unknown address';
  const wildcard = address.address === '::' || address.address === '0.0.0.0';
  const host = wildcard ? 'localhost' : address.family === 'IPv6' ? `[${address.address}]` : address.address;
  return `http://${host}:${address.port}`;
}
