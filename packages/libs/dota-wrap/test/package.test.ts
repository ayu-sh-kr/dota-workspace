import {beforeEach, describe, expect, it, vi} from 'vitest';
import {dotaPackage} from '../src/vite/package';

const calls = vi.hoisted(() => ({ssg: [] as unknown[], ssr: [] as unknown[]}));

vi.mock('../src/ssg', () => ({
  default: (options: unknown) => (calls.ssg.push(options), {name: 'vite-plugin-dota-ssg'}),
  dotaSsr: (options: unknown) => (calls.ssr.push(options), {name: 'vite-plugin-dota-ssr'}),
}));

describe('dotaPackage', () => {
  beforeEach(() => {
    calls.ssg.length = 0;
    calls.ssr.length = 0;
  });

  it.each(['vercel', 'netlify', 'cloudflare-pages', 'github-pages'] as const)('packages SSG and SSR for %s', target => {
    const plugins = dotaPackage(target, {ssg: {entry: '/src/main.ts'}});

    expect(plugins.map(plugin => plugin.name)).toEqual(['vite-plugin-dota-ssg', 'vite-plugin-dota-ssr']);
    expect(calls.ssg).toEqual([{deployment: target, entry: '/src/main.ts'}]);
    expect(calls.ssr).toEqual([{deployment: target}]);
  });

  it('writes no static hosting files for a Node server and forwards its output directory', () => {
    dotaPackage({target: 'node', serverOutDir: 'server'}, {ssg: {}});

    expect(calls.ssg).toEqual([{deployment: false}]);
    expect(calls.ssr).toEqual([{deployment: 'node', serverOutDir: 'server'}]);
  });

  it('passes a Vercel configuration path to SSG', () => {
    dotaPackage({target: 'vercel', vercelConfigFile: '../vercel.json'}, {ssg: {}});

    expect(calls.ssg).toEqual([{deployment: {target: 'vercel', configFile: '../vercel.json'}}]);
  });

  it('lets per-plugin deployments win and SSR follow the SSG target when none is shared', () => {
    dotaPackage('vercel', {ssg: {deployment: 'netlify'}, ssr: {deployment: false}});
    dotaPackage(undefined, {ssg: {deployment: {target: 'github-pages'}}});

    expect(calls.ssg).toEqual([{deployment: 'netlify'}, {deployment: {target: 'github-pages'}}]);
    expect(calls.ssr).toEqual([{deployment: false}, {deployment: 'github-pages'}]);
  });

  it('forwards a trailing-slash opt-out to SSG unless SSG sets its own', () => {
    dotaPackage({target: 'netlify', trailingSlash: false}, {ssg: {}});
    dotaPackage({target: 'netlify', trailingSlash: false}, {ssg: {trailingSlash: true}});

    expect(calls.ssg).toEqual([
      {deployment: 'netlify', trailingSlash: false},
      {deployment: 'netlify', trailingSlash: true},
    ]);
  });

  it('omits disabled plugins', () => {
    expect(dotaPackage('netlify', {ssg: false, ssr: false})).toEqual([]);
  });
});
