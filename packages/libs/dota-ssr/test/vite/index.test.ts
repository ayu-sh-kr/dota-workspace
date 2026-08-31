// @vitest-environment node
import type {ConfigEnv, UserConfig} from 'vite';
import dotaSsg from '@dota/vite';

describe('dotaSsg', () => {
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
