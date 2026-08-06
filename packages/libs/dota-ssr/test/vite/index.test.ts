// @vitest-environment node
import dotaSsg from '@dota/vite';

describe('dotaSsg', () => {
  it('creates a post-build Vite plugin without requiring browser globals', () => {
    const plugin = dotaSsg({routes: ['/']});

    expect(plugin).toMatchObject({
      name: 'vite-plugin-dota-ssg',
      apply: 'build',
      enforce: 'post'
    });
    expect(plugin.configResolved).toBeTypeOf('function');
    expect(plugin.closeBundle).toBeTypeOf('function');
  });
});
