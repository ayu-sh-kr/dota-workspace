import { describe, it, expect } from 'vitest';
import dotaWebTypeJson from '@dota/main.ts';

describe('dotaWebTypeJson', () => {
  it('should return a vite plugin with the correct name', () => {
    const plugin = dotaWebTypeJson();
    expect(plugin.name).toBe('vite-plugin-dota-web-type-json');
  });

  it('should accept config options', () => {
    const plugin = dotaWebTypeJson({ root: '/some/path', outFile: 'custom-web-types.json' });
    expect(plugin.name).toBe('vite-plugin-dota-web-type-json');
  });
});
