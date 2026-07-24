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

import eventMapGenerator, { isEventMapSourceFile } from '@dota/main.ts';

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

async function runConfigResolved(plugin: ReturnType<typeof eventMapGenerator>): Promise<void> {
  if (typeof plugin.configResolved !== 'function') {
    throw new Error('Expected the plugin to expose a configResolved hook.');
  }

  await plugin.configResolved.call({} as never, {
    root: '/workspace',
    resolve: {
      alias: [{find: '@dota', replacement: '/workspace/src'}],
    },
  } as never);
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

  it('normalizes Vite aliases before passing them to the scanner', async () => {
    const plugin = eventMapGenerator({root: '/workspace'});

    await runConfigResolved(plugin);
    await runBuildStart(plugin);

    expect(scanMock).toHaveBeenCalledWith('/workspace', ['/workspace'], expect.objectContaining({
      includeLocations: false,
      resolver: {
        aliases: [{find: '@dota', replacement: '/workspace/src', kind: 'prefix'}],
      },
      onResolutionFailure: expect.any(Function),
    }));
  });

  it('filters watcher paths by scan roots, declarations, and configured extensions', () => {
    expect(isEventMapSourceFile('/workspace/src/events.ts', '/workspace', ['/workspace'])).toBe(true);
    expect(isEventMapSourceFile('/workspace/src/event-map.d.ts', '/workspace', ['/workspace'])).toBe(false);
    expect(isEventMapSourceFile('/workspace/src/events.ts', '/workspace', ['/workspace/shared'])).toBe(false);
    expect(isEventMapSourceFile('/workspace/src/events.tsx', '/workspace', ['/workspace'], ['.ts', '.tsx'])).toBe(true);
  });

  it('watches external scan roots and reloads only for contributing source changes', async () => {
    const handlers = new Map<string, (file: string) => Promise<void>>();
    const watcher = {
      add: vi.fn(),
      on: vi.fn((event: string, handler: (file: string) => Promise<void>) => {
        handlers.set(event, handler);
      }),
    };
    const server = {
      watcher,
      ws: {send: vi.fn()},
    };
    const plugin = eventMapGenerator({
      root: '/workspace',
      scanRoots: ['/workspace', '/workspace/shared'],
    });

    if (typeof plugin.configureServer !== 'function') {
      throw new Error('Expected the plugin to expose configureServer.');
    }
    plugin.configureServer.call({} as never, server as never);

    expect(watcher.add).toHaveBeenCalledWith(['/workspace/shared']);
    await handlers.get('change')?.('/outside/other.ts');
    expect(scanMock).not.toHaveBeenCalled();

    await handlers.get('change')?.('/workspace/shared/src/events.ts');
    expect(scanMock).toHaveBeenCalledOnce();
    expect(server.ws.send).toHaveBeenCalledWith({type: 'full-reload'});
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
