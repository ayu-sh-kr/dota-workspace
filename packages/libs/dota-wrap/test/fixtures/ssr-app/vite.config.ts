import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import {dotaVitePlugins, type DotaVitePluginsOptions} from '../../../src/vite/index.ts';

const root = import.meta.dirname;
const wrapDist = resolve(root, '../../../dist');

// The fixture builds against Dota Wrap's built output, as a published consumer would.
export default defineConfig({
  root,
  logLevel: 'warn',
  oxc: {decorator: {legacy: true}},
  resolve: {
    alias: [{find: /^@ayu-sh-kr\/dota-wrap(?:\/(.*))?$/, replacement: `${wrapDist}/$1/index.mjs`}]
  },
  plugins: dotaVitePlugins({
    root,
    eventMap: false,
    webTypes: false,
    logType: 'warn',
    // Prerenders a page the `/tasks/:id` server route also matches, when the test asks for SSG.
    ssg: process.env.DOTA_FIXTURE_SSG ? {routes: ['/tasks/42']} : false,
    deployment: (process.env.DOTA_FIXTURE_TARGET ?? 'node') as DotaVitePluginsOptions['deployment']
  })
});
