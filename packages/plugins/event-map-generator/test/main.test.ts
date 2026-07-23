import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILT_IN_EVENT_NAMES } from '@dota/Constants.ts';
import type { EventMapScanCandidate } from '@dota/Types.ts';

const { scanMock, declarationMock, locationMock, mkdirMock, writeFileMock } = vi.hoisted(() => ({
  scanMock: vi.fn(),
  declarationMock: vi.fn(),
  locationMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock('@dota/scan/EventMapScanner.ts', () => ({
  scanEventMapSources: scanMock,
}));

vi.mock('@dota/generate/EventMapDeclarationUtils.ts', () => ({
  EventMapDeclarationUtils: {createDeclaration: declarationMock},
}));

vi.mock('@dota/generate/EventMapLocationUtils.ts', () => ({
  EventMapLocationUtils: {createArtifact: locationMock},
}));

vi.mock('node:fs/promises', () => ({
  default: {mkdir: mkdirMock, writeFile: writeFileMock},
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

import eventMapGenerator from '@dota/main.ts';

const candidates: EventMapScanCandidate[] = [{
  name: 'sample:event',
  sourceFile: '/workspace/src/sample.ts',
  kind: 'publish',
  payload: {text: 'null', isComplete: true, imports: []},
  locations: [],
}];

async function runBuildStart(plugin: ReturnType<typeof eventMapGenerator>): Promise<void> {
  if (typeof plugin.buildStart !== 'function') {
    throw new Error('Expected the plugin to expose a function buildStart hook.');
  }

  await plugin.buildStart.call({} as never, {} as never);
}

beforeEach(() => {
  scanMock.mockReset();
  declarationMock.mockReset();
  locationMock.mockReset();
  mkdirMock.mockReset();
  writeFileMock.mockReset();
  scanMock.mockResolvedValue(candidates);
  declarationMock.mockReturnValue({
    names: ['sample:event'],
    declaration: 'export {};\n',
  });
  locationMock.mockReturnValue({
    events: [{key: 'sample:event', published: [], listened: []}],
  });
  mkdirMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
});

describe('eventMapGenerator', () => {
  it('keeps location collection and location writing disabled by default', async () => {
    const plugin = eventMapGenerator({root: '/workspace'});

    await runBuildStart(plugin);

    expect(scanMock).toHaveBeenCalledWith('/workspace', ['/workspace'], {includeLocations: false});
    expect(locationMock).not.toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledOnce();
    expect(writeFileMock).toHaveBeenCalledWith('/workspace/src/event-map.d.ts', 'export {};\n', 'utf8');
  });

  it('merges built-in lifecycle events before declaration generation', async () => {
    const plugin = eventMapGenerator({root: '/workspace'});

    await runBuildStart(plugin);

    const generatedCandidates = declarationMock.mock.calls[0]?.[0] as EventMapScanCandidate[];
    expect(generatedCandidates.slice(0, BUILT_IN_EVENT_NAMES.length).map(candidate => candidate.name)).toEqual([...BUILT_IN_EVENT_NAMES]);
    expect(generatedCandidates.slice(0, BUILT_IN_EVENT_NAMES.length).every(candidate => candidate.payload?.text === 'any')).toBe(true);
  });

  it('writes the optional location artifact beside the declaration', async () => {
    const plugin = eventMapGenerator({
      root: '/workspace',
      outFile: 'generated/event-map.d.ts',
      eventLocations: {outFile: 'generated/event-map.locations.json'},
    });

    await runBuildStart(plugin);

    expect(scanMock).toHaveBeenCalledWith('/workspace', ['/workspace'], {includeLocations: true});
    expect(locationMock).toHaveBeenCalledWith(expect.arrayContaining(candidates), {root: '/workspace'});
    expect(writeFileMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenCalledWith('/workspace/generated/event-map.locations.json', `${JSON.stringify({
      events: [{key: 'sample:event', published: [], listened: []}],
    }, null, 2)}\n`, 'utf8');
    expect(mkdirMock).toHaveBeenCalledWith('/workspace/generated', {recursive: true});
  });

  it('uses the default location path when location generation is enabled with true', async () => {
    const plugin = eventMapGenerator({root: '/workspace', eventLocations: true});

    await runBuildStart(plugin);

    expect(writeFileMock).toHaveBeenCalledWith(
      '/workspace/src/event-map.locations.json',
      `${JSON.stringify({events: [{key: 'sample:event', published: [], listened: []}]}, null, 2)}\n`,
      'utf8',
    );
  });

  it('rejects a location path that would overwrite the declaration', async () => {
    const plugin = eventMapGenerator({
      root: '/workspace',
      eventLocations: {outFile: 'src/event-map.d.ts'},
    });

    await expect(runBuildStart(plugin)).rejects.toThrow(
      'Event declaration and location outputs must use different files',
    );
    expect(scanMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
