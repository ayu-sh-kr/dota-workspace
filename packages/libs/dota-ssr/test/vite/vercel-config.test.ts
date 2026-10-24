// @vitest-environment node
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {resolveSsgRoutes} from '@dota/ssg/route-output';
import {createVercelRedirects, updateVercelConfig} from '@dota/vite/vercel-config';

describe('createVercelRedirects', () => {
  it('skips root output and maps directory and custom HTML outputs to their served URLs', () => {
    expect(createVercelRedirects([
      {path: '/', output: 'index.html'},
      {path: '/blogs', output: 'blogs/index.html'},
      {path: '/feed', output: 'pages/feed.html'}
    ])).toEqual([
      {source: '/blogs', destination: '/blogs/', permanent: true},
      {source: '/feed', destination: '/pages/feed.html', permanent: true}
    ]);
  });
});

describe('updateVercelConfig', () => {
  it('preserves unrelated Vercel settings while replacing generated-route redirects', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'dota-ssr-'));
    const configFile = resolve(directory, 'vercel.json');
    await writeFile(configFile, JSON.stringify({
      rewrites: [{source: '/(.*)', destination: '/index.html'}],
      redirects: [
        {source: '/manual', destination: '/manual.html', permanent: true},
        {source: '/blogs', destination: '/stale.html', permanent: false}
      ],
      headers: [{source: '/assets/(.*)', headers: []}]
    }));

    try {
      await updateVercelConfig(directory, resolveSsgRoutes(['/', '/blogs', '/community']), {configFile});
      const config = JSON.parse(await readFile(configFile, 'utf8'));

      expect(config).toEqual({
        rewrites: [{source: '/(.*)', destination: '/index.html'}],
        redirects: [
          {source: '/manual', destination: '/manual.html', permanent: true},
          {source: '/blogs', destination: '/blogs/', permanent: true},
          {source: '/community', destination: '/community/', permanent: true}
        ],
        headers: [{source: '/assets/(.*)', headers: []}]
      });
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });

  it('serves slashless pages through cleanUrls and drops redirects from the trailing-slash setting', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'dota-vercel-slashless-'));
    const file = resolve(root, 'vercel.json');
    try {
      await writeFile(file, JSON.stringify({redirects: [
        {source: '/guide', destination: '/guide/', permanent: true},
        {source: '/old', destination: '/new', permanent: true}
      ]}));
      await updateVercelConfig(root, resolveSsgRoutes(['/guide', {path: '/custom', output: 'pages/custom.html'}], false), {}, false);
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({cleanUrls: true, redirects: [
        {source: '/old', destination: '/new', permanent: true},
        {source: '/custom', destination: '/pages/custom.html', permanent: true}
      ]});
    } finally {
      await rm(root, {recursive: true, force: true});
    }
  });

  it('rejects a configuration whose redirects property is not an array', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'dota-ssr-'));
    const configFile = resolve(directory, 'vercel.json');
    await writeFile(configFile, JSON.stringify({redirects: {source: '/blogs'}}));

    try {
      await expect(updateVercelConfig(directory, [], {configFile})).rejects.toThrow(
        `Vercel redirects must be an array: ${configFile}`
      );
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});
