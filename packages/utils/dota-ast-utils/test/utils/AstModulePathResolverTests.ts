import {describe, expect, it} from 'vitest';
import {AstModulePathResolver} from '../../src/utils/AstModulePathResolver.ts';
import type {AstModuleIndex} from '../../src/Types.ts';

/** Builds the smallest index needed to test path selection without parsing source. */
function createPathIndex(...paths: string[]): AstModuleIndex {
  return new Map(paths.map(path => [path, {} as never]));
}

describe('AstModulePathResolver', () => {
  it('resolves relative, exact, prefix, and wildcard aliases', () => {
    const index = createPathIndex(
      '/workspace/src/events.ts',
      '/workspace/src/blog/events.ts',
      '/workspace/src/feature/index.ts',
      '/workspace/src/feature/events.ts',
    );

    expect(AstModulePathResolver.resolve('/workspace/src/consumer.ts', './events.ts', index)).toBe('/workspace/src/events.ts');
    expect(AstModulePathResolver.resolve('/workspace/src/consumer.ts', '@events', index, {
      aliases: [{find: '@events', replacement: '/workspace/src/events.ts', kind: 'exact'}],
    })).toBe('/workspace/src/events.ts');
    expect(AstModulePathResolver.resolve('/workspace/src/consumer.ts', '@blog/events', index, {
      aliases: [{find: '@blog', replacement: '/workspace/src/blog', kind: 'prefix'}],
    })).toBe('/workspace/src/blog/events.ts');
    expect(AstModulePathResolver.resolve('/workspace/src/consumer.ts', '@feature/events', index, {
      aliases: [{find: '@feature/*', replacement: '/workspace/src/feature/*', kind: 'wildcard'}],
    })).toBe('/workspace/src/feature/events.ts');
  });

  it('returns null for ambiguous candidates instead of relying on path order', () => {
    const index = createPathIndex('/workspace/src/events.ts', '/workspace/src/events.tsx');

    expect(AstModulePathResolver.resolve('/workspace/src/consumer.ts', './events', index, {
      extensions: ['.ts', '.tsx'],
    })).toBeNull();
    expect(AstModulePathResolver.findCandidates('/workspace/src/consumer.ts', './events', index, {
      extensions: ['.ts', '.tsx'],
    })).toEqual(['/workspace/src/events.ts', '/workspace/src/events.tsx']);
  });
});
