// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createConsola} from 'consola';
import {prepareServerDeployment} from '@dota/vite/deployment/server';
import {resolveSsgRoutes} from '@dota/ssg/route-output';
import type {ServerDeployment} from '@dota/vite/ssr/types';

const logger = createConsola({level: -999});

describe('prepareServerDeployment with prerendered pages', () => {
  let root: string;
  let deployment: ServerDeployment;

  beforeEach(async () => {
    root = await mkdtemp(resolve(tmpdir(), 'dota-server-deployment-'));
    await mkdir(resolve(root, 'dist'));
    await writeFile(resolve(root, 'bundle.mjs'), 'export const handler = async () => undefined;\n');
    await writeFile(resolve(root, 'wrangler.toml'), 'compatibility_flags = ["nodejs_compat"]\n');
    deployment = {
      root,
      outputDirectory: resolve(root, 'dist'),
      bundleFile: resolve(root, 'bundle.mjs'),
      shell: '<!doctype html>',
      routes: ['/tasks/:id', '/tasks/:id/edit'],
      staticRoutes: resolveSsgRoutes(['/tasks/42', '/about']),
      base: '/',
      options: {}
    };
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it('cloudflare-pages: collapses overlapping wildcards and excludes covered prerendered pages', async () => {
    await prepareServerDeployment('cloudflare-pages', deployment, logger);

    expect(JSON.parse(await readFile(resolve(root, 'dist/_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: ['/tasks/*'],
      exclude: ['/tasks/42', '/tasks/42/']
    });
  });

  it('cloudflare-pages: fails before writing when the rules exceed the platform limit', async () => {
    const pages = Array.from({length: 50}, (_, index) => `/tasks/${index}`);

    await expect(prepareServerDeployment('cloudflare-pages', {...deployment, staticRoutes: resolveSsgRoutes(pages)}, logger))
      .rejects.toThrow('Cloudflare Pages accepts 100 rules in _routes.json, but 1 server route patterns and 100 exclusions');
    await expect(readFile(resolve(root, 'dist/_routes.json'), 'utf8')).rejects.toThrow('ENOENT');
  });

  it('netlify: excludes covered prerendered pages from the function paths', async () => {
    await prepareServerDeployment('netlify', {...deployment, base: '/app/'}, logger);

    expect(await readFile(resolve(root, '.netlify/v1/functions/dota-ssr/dota-ssr.mjs'), 'utf8')).toContain(
      'export const config = {"path":["/app/tasks/:id","/app/tasks/:id/edit"],"excludedPath":["/app/tasks/42","/app/tasks/42/"]};'
    );
  });

  it('vercel: adds rewrites to the configured file that static generation updated', async () => {
    await writeFile(resolve(root, 'site.json'), JSON.stringify({redirects: [{source: '/tasks/42', destination: '/tasks/42/', permanent: true}]}));

    await prepareServerDeployment('vercel', {...deployment, options: {vercelConfigFile: 'site.json'}}, logger);

    expect(JSON.parse(await readFile(resolve(root, 'site.json'), 'utf8'))).toEqual({
      redirects: [{source: '/tasks/42', destination: '/tasks/42/', permanent: true}],
      rewrites: [
        {source: '/tasks/:id', destination: '/api/dota-ssr?__dota_path=/tasks/:id'},
        {source: '/tasks/:id/edit', destination: '/api/dota-ssr?__dota_path=/tasks/:id/edit'}
      ]
    });
    await expect(readFile(resolve(root, 'vercel.json'), 'utf8')).rejects.toThrow('ENOENT');
  });
});
