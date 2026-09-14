// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {prepareDeployment} from '@dota/vite/deployment';
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

  it.each(['netlify', 'cloudflare-pages'] as const)('%s preserves public rules and replaces its generated block', async target => {
    const file = resolve(output, '_redirects');
    const fallback = '# User rules\n/old /new 301\n/* /index.html 200\n';
    await writeFile(file, fallback);
    const routes = resolveSsgRoutes(['/', '/guide', {path: '/custom', output: 'pages/custom.html'}]);

    await prepareDeployment(root, output, routes, {deployment: target}, '/project/');
    const first = await readFile(file, 'utf8');
    expect(first).toContain('/project/guide /project/guide/index.html 200\n');
    expect(first).toContain('/project/custom /project/pages/custom.html 200\n');
    expect(first.endsWith(fallback)).toBe(true);
    await prepareDeployment(root, output, routes, {deployment: target}, '/project/');
    expect(await readFile(file, 'utf8')).toBe(first);

    await prepareDeployment(root, output, [], {deployment: target});
    expect(await readFile(file, 'utf8')).toBe(`# BEGIN dota-ssg\n# END dota-ssg\n${fallback}`);
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
