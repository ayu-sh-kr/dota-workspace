// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {prepareDeployment} from '@dota/vite/deployment';
import {takeStaticDeployment} from '@dota/vite/deployment/static-deployment';
import {resolveSsgRoutes} from '@dota/ssg/route-output';

describe('deployment configuration', () => {
  let root: string;
  let output: string;

  beforeEach(async () => {
    root = await mkdtemp(resolve(tmpdir(), 'dota-deployment-'));
    output = resolve(root, 'dist');
    await mkdir(output);
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it('keeps legacy Vercel options and gives explicit deployment precedence', async () => {
    const config = resolve(root, 'custom.json');
    await writeFile(config, '{"cleanUrls":true}');
    const routes = resolveSsgRoutes(['/guide']);

    await prepareDeployment(root, output, routes, {vercel: {configFile: 'custom.json'}});
    const updated = await readFile(config, 'utf8');
    expect(JSON.parse(updated)).toEqual({cleanUrls: true, redirects: [
      {source: '/guide', destination: '/guide/', permanent: true}
    ]});
    await prepareDeployment(root, output, [], {deployment: false, vercel: {configFile: 'missing.json'}});
    await prepareDeployment(root, output, [], {deployment: 'netlify', vercel: {configFile: 'missing.json'}});
    expect(await readFile(config, 'utf8')).toBe(updated);

    await prepareDeployment(root, output, routes, {deployment: {target: 'vercel', configFile: 'custom.json'}});
    expect(await readFile(config, 'utf8')).toBe(updated);
  });

  it.each(['netlify', 'cloudflare-pages'] as const)('%s keeps native trailing-slash redirects, preserves public rules, and replaces its generated block', async target => {
    const file = resolve(output, '_redirects');
    const fallback = '# User rules\n/old /new 301\n/* /index.html 200\n';
    await writeFile(file, fallback);
    const routes = resolveSsgRoutes(['/', '/guide', {path: '/custom', output: 'pages/custom.html'}]);

    await prepareDeployment(root, output, routes, {deployment: target}, '/project/');
    const first = await readFile(file, 'utf8');
    expect(first).not.toContain('/project/guide ');
    expect(first).toContain('/project/custom /project/pages/custom.html 200\n');
    expect(first.endsWith(fallback)).toBe(true);
    await prepareDeployment(root, output, routes, {deployment: target}, '/project/');
    expect(await readFile(file, 'utf8')).toBe(first);

    await prepareDeployment(root, output, [], {deployment: target});
    expect(await readFile(file, 'utf8')).toBe(`# BEGIN dota-ssg\n# END dota-ssg\n${fallback}`);
  });

  it.each(['netlify', 'cloudflare-pages'] as const)('%s leaves _redirects untouched when route rules are off', async target => {
    const file = resolve(output, '_redirects');
    await writeFile(file, '/* /index.html 200\n');

    await prepareDeployment(root, output, resolveSsgRoutes([{path: '/custom', output: 'pages/custom.html'}]), {deployment: {target, redirects: false}});

    expect(await readFile(file, 'utf8')).toBe('/* /index.html 200\n');
  });

  it('leaves vercel.json untouched and writes only .nojekyll for GitHub Pages when route rules are off', async () => {
    const config = resolve(root, 'vercel.json');
    await writeFile(config, '{}');
    const routes = resolveSsgRoutes([{path: '/custom', output: 'pages/custom.html'}]);
    await mkdir(resolve(output, 'pages'));
    await writeFile(resolve(output, 'pages/custom.html'), '<p>custom</p>');

    await prepareDeployment(root, output, routes, {deployment: {target: 'vercel', redirects: false}});
    await prepareDeployment(root, output, routes, {deployment: {target: 'github-pages', redirects: false}});

    expect(await readFile(config, 'utf8')).toBe('{}');
    expect(await readFile(resolve(output, '.nojekyll'), 'utf8')).toBe('');
    await expect(readFile(resolve(output, 'custom/index.html'), 'utf8')).rejects.toThrow('ENOENT');
  });

  it('records the written routes and target for the SSR deployment of the same build', async () => {
    const routes = resolveSsgRoutes(['/guide']);

    await prepareDeployment(root, output, routes, {deployment: {target: 'cloudflare-pages', redirects: false}});

    expect(takeStaticDeployment(output)).toEqual({routes, deployment: {target: 'cloudflare-pages', redirects: false}, trailingSlash: true});
    expect(takeStaticDeployment(output)).toBeUndefined();
    await prepareDeployment(root, output, routes, {deployment: false, trailingSlash: false});
    expect(takeStaticDeployment(output)).toEqual({routes, deployment: false, trailingSlash: false});
  });

  it('rejects malformed managed blocks without changing user rules', async () => {
    const file = resolve(output, '_redirects');
    await writeFile(file, '# BEGIN dota-ssg\n/old /new 301\n');
    await expect(prepareDeployment(root, output, [], {deployment: 'netlify'})).rejects.toThrow('Malformed');
    expect(await readFile(file, 'utf8')).toBe('# BEGIN dota-ssg\n/old /new 301\n');
  });

  it('makes custom documents reachable on GitHub Pages without changing their content', async () => {
    await writeFile(resolve(output, 'custom.html'), '<h1>Guide</h1>');
    const routes = resolveSsgRoutes([{path: '/guide', output: 'custom.html'}]);
    await prepareDeployment(root, output, routes, {deployment: 'github-pages'}, '/repo/');
    expect(await readFile(resolve(output, 'guide/index.html'), 'utf8')).toBe('<h1>Guide</h1>');
    expect(await readFile(resolve(output, '.nojekyll'), 'utf8')).toBe('');
    await expect(prepareDeployment(root, output, routes, {deployment: 'github-pages'})).resolves.toBeUndefined();
  });

  it('aliases custom documents to slashless files on GitHub Pages when trailing slashes are off', async () => {
    await writeFile(resolve(output, 'custom.html'), '<h1>Guide</h1>');
    const routes = resolveSsgRoutes([{path: '/guide', output: 'custom.html'}], false);
    await prepareDeployment(root, output, routes, {deployment: 'github-pages', trailingSlash: false});
    expect(await readFile(resolve(output, 'guide.html'), 'utf8')).toBe('<h1>Guide</h1>');
  });

  it.each(['netlify', 'cloudflare-pages'] as const)('%s needs no rule for slashless pages', async target => {
    await prepareDeployment(root, output, resolveSsgRoutes(['/guide'], false), {deployment: target, trailingSlash: false});
    expect(await readFile(resolve(output, '_redirects'), 'utf8')).toBe('# BEGIN dota-ssg\n# END dota-ssg\n');
  });

  it('does not overwrite a conflicting GitHub Pages route document', async () => {
    await mkdir(resolve(output, 'guide'));
    await writeFile(resolve(output, 'guide/index.html'), 'Existing page');
    await writeFile(resolve(output, 'custom.html'), 'Custom page');
    await expect(prepareDeployment(root, output, resolveSsgRoutes([
      {path: '/guide', output: 'custom.html'}
    ]), {deployment: 'github-pages'})).rejects.toThrow('conflicts');
    expect(await readFile(resolve(output, 'guide/index.html'), 'utf8')).toBe('Existing page');
  });
});
