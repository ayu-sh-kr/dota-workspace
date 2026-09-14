// @vitest-environment node
import type {ConfigEnv, ResolvedConfig, UserConfig} from 'vite';
import dotaSsg from '@dota/vite';
import {generateStaticPages} from '@dota/ssg/generate';

vi.mock('@dota/ssg/generate', () => ({generateStaticPages: vi.fn()}));

describe('dotaSsg', () => {
  it.each([undefined, 2])('delegates generation with normalized concurrency %s', async concurrency => {
    const config = {root: '/app', build: {outDir: 'dist'}} as ResolvedConfig;
    const plugin = dotaSsg({routes: ['/'], concurrency});
    const configure = plugin.configResolved;
    const close = plugin.closeBundle;
    if (typeof configure !== 'function' || typeof close !== 'function') {
      throw new Error('Expected callable SSG hooks');
    }
    vi.mocked(generateStaticPages).mockClear();
    await configure.call({} as never, config);
    await close.call({} as never);

    expect(generateStaticPages).toHaveBeenCalledExactlyOnceWith(config, {
      routes: ['/'], concurrency: concurrency ?? 1, renderTimeout: 120_000
    });
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid concurrency %s', concurrency => {
    expect(() => dotaSsg({concurrency})).toThrow('SSG concurrency must be a positive integer');
  });

  it.each([0, -1, 1.5, Infinity, 2_147_483_648])('rejects invalid worker timeout %s', renderTimeout => {
    expect(() => dotaSsg({renderTimeout})).toThrow('SSG renderTimeout');
  });

  it('rejects parallel callbacks instead of silently dropping their readiness work', () => {
    expect(() => dotaSsg({concurrency: 2, settle: () => {}})).toThrow('cannot transfer a settle callback');
  });
  const buildEnvironment: ConfigEnv = {
    command: 'build',
    mode: 'production',
    isSsrBuild: false,
    isPreview: false
  };

  it('creates a post-build Vite plugin without requiring browser globals', () => {
    const plugin = dotaSsg({routes: ['/']});

    expect(plugin).toMatchObject({
      name: 'vite-plugin-dota-ssg',
      enforce: 'post'
    });
    expect(plugin.apply).toBeTypeOf('function');
    expect(plugin.configResolved).toBeTypeOf('function');
    expect(plugin.closeBundle).toBeTypeOf('function');
  });

  it('runs only for build commands containing the --ssg flag', () => {
    const plugin = dotaSsg({routes: ['/']});
    const apply = plugin.apply;
    if (typeof apply !== 'function') throw new Error('Expected dotaSsg to use a conditional apply hook');

    const originalArguments = process.argv;
    try {
      process.argv = [...originalArguments, '--ssg'];
      expect(apply({} as UserConfig, buildEnvironment)).toBe(true);
      expect(apply({} as UserConfig, {...buildEnvironment, command: 'serve'})).toBe(false);

      process.argv = originalArguments.filter(argument => argument !== '--ssg');
      expect(apply({} as UserConfig, buildEnvironment)).toBe(false);
    } finally {
      process.argv = originalArguments;
    }
  });
});
