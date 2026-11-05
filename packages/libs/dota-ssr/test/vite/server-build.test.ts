// @vitest-environment node
import {serverEntrySource} from '@dota/vite/ssr/server-build';

describe('serverEntrySource', () => {
  it('passes only the handler options that are set, so handler defaults stay the defaults', () => {
    const plain = serverEntrySource('/app/src/main.ts', 'cloudflare-pages', {});
    const configured = serverEntrySource('/app/src/main.ts', 'node', {hydration: false, trailingSlash: false, cacheControl: 'public, s-maxage=60'});

    expect(plain).toContain('{template, ...{"hydration":true}}');
    expect(plain).not.toContain('createNodeServer');
    expect(configured).toContain('{template, ...{"hydration":false,"trailingSlash":false,"cacheControl":"public, s-maxage=60"}}');
    expect(configured).toContain('export {createNodeServer}');
  });

  it('exports the server and browser route lists the build reads', () => {
    const source = serverEntrySource('/app/src/main.ts', 'vercel', {});

    expect(source).toContain('export const serverRoutes');
    expect(source).toContain('export const clientRoutes = async () => resolveClientRoutes(');
  });
});
