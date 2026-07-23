import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(testDir, '../fixtures/basic');

describe('event map scanner', () => {
  it('discovers decorated handlers and publish calls', async () => {
    const candidates = await scanEventMapSources(fixtureRoot, [fixtureRoot]);

    expect(candidates.map(candidate => candidate.name)).toEqual([
      'sample:created',
      'sample:published'
    ]);
    expect(candidates.map(candidate => candidate.kind)).toEqual([
      'decorator',
      'publish'
    ]);
    expect(candidates.map(candidate => candidate.payload?.text)).toEqual([
      'any',
      '{ id: number; enabled: boolean }',
    ]);
    expect(candidates.map(candidate => candidate.payload?.isComplete)).toEqual([
      false,
      true,
    ]);
  });
});
