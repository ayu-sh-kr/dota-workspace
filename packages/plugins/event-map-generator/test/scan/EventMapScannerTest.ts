import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(testDir, '../fixtures/basic');
const constantsFixtureRoot = resolve(testDir, '../fixtures/constants');
const payloadCallsFixtureRoot = resolve(testDir, '../fixtures/payload-calls');

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

  it('resolves constant event names across declarations, aliases, wrappers, and static properties', async () => {
    const candidates = await scanEventMapSources(constantsFixtureRoot, [constantsFixtureRoot]);

    expect(candidates.map(candidate => `${candidate.kind}:${candidate.name}`)).toEqual([
      'decorator:user:archived',
      'decorator:user:created',
      'decorator:user:updated',
      'publish:direct:wrapped',
      'publish:static:compatibility',
      'publish:static:readonly',
      'publish:user:updated',
    ]);
  });

  it('keeps identifier-based locations anchored at the occurrence expression', async () => {
    const candidates = await scanEventMapSources(constantsFixtureRoot, [constantsFixtureRoot], {includeLocations: true});
    const source = await readFile(resolve(constantsFixtureRoot, 'src/consumer.ts'), 'utf8');
    const listened = candidates.find(candidate => candidate.kind === 'decorator' && candidate.name === 'user:created');
    const published = candidates.find(candidate => candidate.kind === 'publish' && candidate.name === 'static:readonly');

    expect(listened?.locations?.[0]?.offset).toBe(source.indexOf('USER_CREATED_EVENT', source.indexOf('@OnEvent')));
    expect(published?.locations?.[0]?.offset).toBe(source.indexOf('UserEvents.STATIC_EVENT'));
  });

  it('resolves explicit callable returns for direct and identifier-mediated payloads', async () => {
    const candidates = await scanEventMapSources(payloadCallsFixtureRoot, [payloadCallsFixtureRoot]);
    const payloadByName = new Map(candidates.map(candidate => [candidate.name, candidate.payload]));
    const completeNames = [
      'payload:arrow-call',
      'payload:identifier-call',
      'payload:function-return',
      'payload:function-expression-return',
      'payload:explicit-local-annotation',
    ];

    completeNames.forEach(name => {
      expect(payloadByName.get(name)).toMatchObject({
        text: 'ExplicitPayload',
        isComplete: true,
      });
    });
    expect(payloadByName.get('payload:unannotated-call')).toMatchObject({text: 'unknown', isComplete: false});
    expect(payloadByName.get('payload:computed-call')).toMatchObject({text: 'unknown', isComplete: false});
    expect(payloadByName.get('payload:arrow-call')?.imports).toEqual([{
      name: 'ExplicitPayload',
      moduleSpecifier: './call-payload.ts',
      sourceFile: resolve(payloadCallsFixtureRoot, 'src/call-payload.ts'),
    }]);
  });
});
