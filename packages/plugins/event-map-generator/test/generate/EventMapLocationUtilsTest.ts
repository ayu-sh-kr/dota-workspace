import { describe, expect, it } from 'vitest';
import { EventMapLocationUtils } from '@dota/generate/EventMapLocationUtils.ts';

describe('EventMapLocationUtils.createArtifact', () => {
  it('groups, normalizes, and sorts publication and listener locations', () => {
    const artifact = EventMapLocationUtils.createArtifact([
      {
        name: 'zeta:event',
        sourceFile: '/workspace/src/zeta.ts',
        kind: 'publish',
        locations: [{
          sourceFile: '/workspace/src/zeta.ts',
          offset: 50,
          className: 'ZetaFeature',
          classOffset: 10,
        }],
      },
      {
        name: 'alpha:event',
        sourceFile: '/workspace/src/alpha.ts',
        kind: 'decorator',
        locations: [{
          sourceFile: '/workspace/src/alpha.ts',
          offset: 30,
          className: 'AlphaFeature',
          classOffset: 5,
        }],
      },
      {
        name: 'alpha:event',
        sourceFile: '/workspace/src/alpha.ts',
        kind: 'publish',
        locations: [{
          sourceFile: '/workspace/src/alpha.ts',
          offset: 12,
          className: null,
          classOffset: null,
        }],
      },
      {
        name: 'missing:event',
        sourceFile: '/workspace/src/missing.ts',
        kind: 'decorator',
      },
    ], {root: '/workspace'});

    expect(artifact).toEqual({
      events: [
        {
          key: 'alpha:event',
          published: [{
            sourceFile: './src/alpha.ts',
            offset: 12,
            className: null,
            classOffset: null,
          }],
          listened: [{
            sourceFile: './src/alpha.ts',
            offset: 30,
            className: 'AlphaFeature',
            classOffset: 5,
          }],
        },
        {
          key: 'missing:event',
          published: [],
          listened: [],
        },
        {
          key: 'zeta:event',
          published: [{
            sourceFile: './src/zeta.ts',
            offset: 50,
            className: 'ZetaFeature',
            classOffset: 10,
          }],
          listened: [],
        },
      ],
    });
  });

  it('does not mutate scanner-owned location arrays', () => {
    const locations = [{
      sourceFile: '/workspace/src/feature.ts',
      offset: 20,
      className: 'Feature',
      classOffset: 4,
    }];

    EventMapLocationUtils.createArtifact([{
      name: 'feature:event',
      sourceFile: '/workspace/src/feature.ts',
      kind: 'publish',
      locations,
    }], {root: '/workspace'});

    expect(locations).toEqual([{
      sourceFile: '/workspace/src/feature.ts',
      offset: 20,
      className: 'Feature',
      classOffset: 4,
    }]);
  });
});
