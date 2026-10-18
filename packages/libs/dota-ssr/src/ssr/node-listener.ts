import type {IncomingMessage, ServerResponse} from 'node:http';
import type {RequestHandler} from './types';

// Kept free of Dota Core imports: the Vite plugin uses it while loading a Vite config,
// before any DOM shim is installed.

/** Connect-style continuation used by Vite and Express middleware stacks. */
type NextFunction = (error?: unknown) => void;

/**
 * Adapts a {@link RequestHandler} to Node's `http` server and connect middleware.
 * Requests the handler declines go to `next`, or receive a 404 when there is no
 * middleware chain; thrown render errors go to `next(error)` or become a 500.
 * @param handler Web-standard page handler.
 */
export function toNodeListener(handler: RequestHandler) {
  return async (incoming: IncomingMessage, outgoing: ServerResponse, next?: NextFunction): Promise<void> => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        for (const entry of [value ?? []].flat()) headers.append(name, entry);
      }
      const url = new URL(incoming.url ?? '/', `http://${incoming.headers.host ?? 'localhost'}`);
      const response = await handler(new Request(url, {method: incoming.method, headers}));
      if (!response) {
        if (next) next();
        else outgoing.writeHead(404).end();
        return;
      }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (next) next(error);
      else outgoing.writeHead(500).end();
    }
  };
}
