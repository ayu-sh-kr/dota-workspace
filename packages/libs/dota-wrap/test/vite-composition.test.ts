import {describe, expect, it} from 'vitest';
import {dotaVitePlugins} from '../src/vite';

describe('dotaVitePlugins', () => {
  it('returns the Dota plugins in composition order and keeps SSG opt-in', () => {
    const plugins = dotaVitePlugins({
      root: '/workspace/app',
      scanRoots: ['/workspace/app', '/workspace/ui'],
      ssg: false,
    });

    expect(plugins.map(plugin => plugin.name)).toEqual([
      'vite-plugin-dota-preloader',
      'vite-plugin-event-map-generator',
      'vite-plugin-dota-web-type-json',
      'vite-plugin-dota-ssr',
      'vite-plugin-dota-remote-stylesheets',
    ]);
  });

  it('can leave out request-time rendering', () => {
    expect(dotaVitePlugins({ssg: false, ssr: false}).map(plugin => plugin.name)).not.toContain('vite-plugin-dota-ssr');
  });

  it('appends explicitly supplied integrations without enabling them by default', () => {
    const nitro = {name: 'nitro'};

    const plugins = dotaVitePlugins({
      preloader: false,
      eventMap: false,
      webTypes: false,
      ssg: false,
      ssr: false,
      remoteStylesheets: false,
      extensions: [nitro],
    });

    expect(plugins).toEqual([nitro]);
  });
});
