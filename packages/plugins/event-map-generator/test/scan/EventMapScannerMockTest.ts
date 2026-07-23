import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSync, type ClassMethod, type Module } from '@swc/core';
import { EventMapScanPath } from '@dota/Constants.ts';

const { fgMock, readFileMock, parseMock } = vi.hoisted(() => ({
  fgMock: vi.fn(),
  readFileMock: vi.fn(),
  parseMock: vi.fn(),
}));

vi.mock('fast-glob', () => ({ default: fgMock }));

vi.mock('node:fs/promises', () => ({
  default: { readFile: readFileMock },
  readFile: readFileMock,
}));

vi.mock('@swc/core', async () => {
  const actual = await vi.importActual<typeof import('@swc/core')>('@swc/core');
  return { ...actual, parse: parseMock };
});

import {
  getFirstParameterType,
  getMethodName,
  scanEventMapSources,
} from '@dota/scan/EventMapScanner.ts';

const sourceByFile = new Map<string, string>();

function parseSource(source: string): Module {
  return parseSync(source, { syntax: 'typescript', decorators: true }) as Module;
}

function findClassMethod(module: Module): ClassMethod {
  const classDeclaration = module.body[0];
  if (classDeclaration?.type !== 'ClassDeclaration') {
    throw new Error('Expected a class declaration');
  }

  const method = classDeclaration.body.find(member => member.type === 'ClassMethod');
  if (method == null) {
    throw new Error('Expected a class method');
  }

  return method;
}

function parseClassMethod(methodSource: string): ClassMethod {
  return findClassMethod(parseSource(`class Feature { ${methodSource} }`));
}

function parseClassMethodWithContext(methodSource: string): {
  method: ClassMethod;
  context: Parameters<typeof getFirstParameterType>[1];
} {
  const sourceText = `class Feature { ${methodSource} }`;
  const module = parseSource(sourceText);

  return {
    method: findClassMethod(module),
    context: {
      imports: new Map(),
      moduleStart: module.span.start,
      sourceText,
      typeBindings: [],
    },
  };
}

beforeEach(() => {
  fgMock.mockReset();
  readFileMock.mockReset();
  parseMock.mockReset();
  sourceByFile.clear();
});

describe('getMethodName', () => {
  it('returns null for computed method names', () => {
    const method = parseClassMethod('[computed]() {}');

    expect(getMethodName(method)).toBeNull();
  });

  it('returns null for unsupported private method keys', () => {
    const method = {
      key: { type: 'PrivateName', value: 'private' },
    } as unknown as ClassMethod;

    expect(getMethodName(method)).toBeNull();
  });

  it('returns the identifier method name', () => {
    const method = parseClassMethod('handle() {}');

    expect(getMethodName(method)).toBe('handle');
  });

  it('returns the string-literal method name', () => {
    const method = parseClassMethod("'named-handler'() {}");

    expect(getMethodName(method)).toBe('named-handler');
  });
});

describe('getFirstParameterType', () => {
  it('returns null when the method has no first parameter', () => {
    const { method, context } = parseClassMethodWithContext('handle() {}');

    expect(getFirstParameterType(method, context)).toBeNull();
  });

  it('returns null when the first parameter is unannotated', () => {
    const { method, context } = parseClassMethodWithContext('handle(payload) {}');

    expect(getFirstParameterType(method, context)).toBeNull();
  });

  it('returns the first identifier parameter annotation', () => {
    const { method, context } = parseClassMethodWithContext('handle(payload: FeaturePayload) {}');

    expect(getFirstParameterType(method, context)).toEqual({
      text: 'FeaturePayload',
      isComplete: true,
      referencedNames: ['FeaturePayload'],
    });
  });

  it('returns the annotation attached to a destructured first parameter', () => {
    const { method, context } = parseClassMethodWithContext('handle({ message }: SoftNotification) {}');

    expect(getFirstParameterType(method, context)).toEqual({
      text: 'SoftNotification',
      isComplete: true,
      referencedNames: ['SoftNotification'],
    });
  });
});

describe('scanEventMapSources', () => {
  it('propagates file-discovery failures without reading or parsing files', async () => {
    const root = '/workspace';
    const discoveryError = new Error('discovery failed');

    fgMock.mockRejectedValueOnce(discoveryError);

    await expect(scanEventMapSources(root)).rejects.toBe(discoveryError);

    expect(fgMock).toHaveBeenCalledOnce();
    expect(fgMock).toHaveBeenCalledWith([EventMapScanPath.SOURCE_DIRECTORY_SCAN_PATH], {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: [EventMapScanPath.SOURCE_DECLARATION_IGNORE_PATTERN],
    });
    expect(readFileMock).not.toHaveBeenCalled();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it('propagates file-read failures without attempting a parse', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/a.ts');
    const laterSourceFile = resolve(root, './src/b.ts');
    const readError = new Error('read failed');

    fgMock.mockResolvedValueOnce([sourceFile, laterSourceFile]);
    readFileMock.mockRejectedValueOnce(readError);

    await expect(scanEventMapSources(root)).rejects.toBe(readError);

    expect(fgMock).toHaveBeenCalledOnce();
    expect(readFileMock).toHaveBeenCalledOnce();
    expect(readFileMock).toHaveBeenCalledWith(sourceFile, 'utf8');
    expect(readFileMock).not.toHaveBeenCalledWith(laterSourceFile, 'utf8');
    expect(parseMock).not.toHaveBeenCalled();
  });

  it('propagates parse failures after successfully discovering and reading the file', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/a.ts');
    const laterSourceFile = resolve(root, './src/b.ts');
    const source = "publisher.publish({ name: 'sample:event' });";
    const parseError = new Error('parse failed');

    fgMock.mockResolvedValueOnce([sourceFile, laterSourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockRejectedValueOnce(parseError);

    await expect(scanEventMapSources(root)).rejects.toBe(parseError);

    expect(fgMock).toHaveBeenCalledOnce();
    expect(readFileMock).toHaveBeenCalledWith(sourceFile, 'utf8');
    expect(readFileMock).not.toHaveBeenCalledWith(laterSourceFile, 'utf8');
    expect(parseMock).toHaveBeenCalledOnce();
    expect(parseMock).toHaveBeenCalledWith(source, { syntax: 'typescript', decorators: true });
  });

  it('returns no candidates when discovery succeeds with no files', async () => {
    const root = '/workspace';

    fgMock.mockResolvedValueOnce([]);

    await expect(scanEventMapSources(root)).resolves.toEqual([]);

    expect(readFileMock).not.toHaveBeenCalled();
    expect(parseMock).not.toHaveBeenCalled();
  });

  it('normalizes roots, deduplicates files, and recovers typed publish and emit payloads', async () => {
    const root = '/workspace';
    const firstRoot = './src';
    const secondRoot = './src/pages';
    const absoluteA = resolve(root, './src/a.ts');
    const absoluteB = resolve(root, './src/b.ts');
    const sourceA = `
      class Feature {
        @OnEvent('alpha:event')
        handle() {}

        publish(payload: ImportedPayload) {
          publisher.publish({ name: 'alpha:event', data: { payload, count: 1 } });
        }
      }
    `;
    const sourceB = `
      publisher.emit({ name: 'beta:event', data: ['ready', 'later'] });
    `;

    sourceByFile.set(absoluteA, sourceA);
    sourceByFile.set(absoluteB, sourceB);
    fgMock.mockResolvedValueOnce([absoluteB, absoluteA]).mockResolvedValueOnce([absoluteA]);
    readFileMock.mockImplementation(async (file: string) => sourceByFile.get(file));
    parseMock.mockImplementation(async (source: string) => parseSource(source));

    const candidates = await scanEventMapSources(root, [firstRoot, secondRoot]);

    expect(fgMock).toHaveBeenCalledTimes(2);
    expect(fgMock).toHaveBeenNthCalledWith(1, [EventMapScanPath.SOURCE_DIRECTORY_SCAN_PATH], {
      cwd: resolve(root, firstRoot),
      absolute: true,
      onlyFiles: true,
      ignore: [EventMapScanPath.SOURCE_DECLARATION_IGNORE_PATTERN],
    });
    expect(fgMock).toHaveBeenNthCalledWith(2, [EventMapScanPath.SOURCE_DIRECTORY_SCAN_PATH], {
      cwd: resolve(root, secondRoot),
      absolute: true,
      onlyFiles: true,
      ignore: [EventMapScanPath.SOURCE_DECLARATION_IGNORE_PATTERN],
    });
    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenNthCalledWith(1, absoluteA, 'utf8');
    expect(readFileMock).toHaveBeenNthCalledWith(2, absoluteB, 'utf8');
    expect(parseMock).toHaveBeenCalledTimes(2);
    expect(parseMock).toHaveBeenNthCalledWith(1, sourceA, { syntax: 'typescript', decorators: true });
    expect(parseMock).toHaveBeenNthCalledWith(2, sourceB, { syntax: 'typescript', decorators: true });

    expect(candidates).toEqual([
      {
        name: 'alpha:event',
        sourceFile: absoluteA,
        kind: 'decorator',
        payload: { text: 'any', isComplete: false, imports: [] },
      },
      {
        name: 'alpha:event',
        sourceFile: absoluteA,
        kind: 'publish',
        payload: { text: '{ payload: ImportedPayload; count: number }', isComplete: true, imports: [] },
      },
      {
        name: 'beta:event',
        sourceFile: absoluteB,
        kind: 'publish',
        payload: { text: '(string)[]', isComplete: true, imports: [] },
      },
    ]);
  });

  it('collects event-key and class offsets only when location scanning is enabled', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/feature.ts');
    const source = `// leading comment
const café = "☕";
class Feature {
  @OnEvent("shared:event")
  handle() {}

  publish() {
    publisher.publish({ name: "shared:event", data: null });
  }
}
publisher.emit({ name: "module:event" });`;
    const classOffset = source.indexOf('Feature');
    const listenedEventOffset = source.indexOf('"shared:event"');
    const publishedEventOffset = source.indexOf('"shared:event"', listenedEventOffset + 1);
    const moduleEventOffset = source.indexOf('"module:event"');

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root, [root], {includeLocations: true});
    expect(candidates).toEqual([
      {
        name: 'shared:event',
        sourceFile,
        kind: 'decorator',
        payload: {text: 'any', isComplete: false, imports: []},
        locations: [{
          sourceFile,
          offset: listenedEventOffset,
          className: 'Feature',
          classOffset,
        }],
      },
      {
        name: 'module:event',
        sourceFile,
        kind: 'publish',
        payload: {text: 'null', isComplete: true, imports: []},
        locations: [{
          sourceFile,
          offset: moduleEventOffset,
          className: null,
          classOffset: null,
        }],
      },
      {
        name: 'shared:event',
        sourceFile,
        kind: 'publish',
        payload: {text: 'null', isComplete: true, imports: []},
        locations: [{
          sourceFile,
          offset: publishedEventOffset,
          className: 'Feature',
          classOffset,
        }],
      },
    ]);
  });

  it('preserves imported payload type dependencies required by generated declarations', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/payload.ts');
    const source = `
      import type { ThemeName } from '@example/theme';
      const payload: ThemeName = 'flat' as ThemeName;
      publisher.publish({ name: 'theme:change', data: payload });
    `;

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root);

    expect(candidates[0]?.payload).toEqual({
      text: 'ThemeName',
      isComplete: true,
      imports: [{ name: 'ThemeName', moduleSpecifier: '@example/theme', sourceFile }],
    });
  });

  it('records an exported local payload type so generation can import it from its source file', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/payload.ts');
    const source = `
      export interface LocalPayload { id: string }
      const payload: LocalPayload = { id: 'one' };
      publisher.publish({ name: 'local:payload', data: payload });
    `;

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root);

    expect(candidates[0]?.payload).toEqual({
      text: 'LocalPayload',
      isComplete: true,
      imports: [{ name: 'LocalPayload', moduleSpecifier: './payload.ts', sourceFile }],
    });
  });

  it('records a locally named type export used by an event payload', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/payload.ts');
    const source = `
      type LocalPayload = { id: string };
      export type { LocalPayload };
      const payload: LocalPayload = { id: 'one' };
      publisher.publish({ name: 'local:named-payload', data: payload });
    `;

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root);

    expect(candidates[0]?.payload?.imports).toEqual([
      { name: 'LocalPayload', moduleSpecifier: './payload.ts', sourceFile },
    ]);
  });

  it('resolves annotated class fields used through a this-member payload reference', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/field.ts');
    const source = `
      class Feature {
        toolId: string = '';
        publish() {
          publisher.publish({ name: 'tool:select', data: { toolId: this.toolId } });
        }
      }
    `;

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root);

    expect(candidates[0]?.payload).toEqual({
      text: '{ toolId: string }',
      isComplete: true,
      imports: [],
    });
  });

  it('recovers subscription-only payload types forwarded from event.data to an annotated method', async () => {
    const root = '/workspace';
    const sourceFile = resolve(root, './src/notification.ts');
    const source = `
      export interface SoftNotification { message: string }
      class NotificationService {
        @OnEvent('notification:info')
        handle(event: ApplicationEvent<'notification:info'>) {
          this.show(event.data);
        }

        show({ message }: SoftNotification) {}
      }
    `;

    fgMock.mockResolvedValueOnce([sourceFile]);
    readFileMock.mockResolvedValueOnce(source);
    parseMock.mockResolvedValueOnce(parseSource(source));

    const candidates = await scanEventMapSources(root);

    expect(candidates[0]?.payload).toEqual({
      text: 'SoftNotification',
      isComplete: true,
      imports: [{ name: 'SoftNotification', moduleSpecifier: './notification.ts', sourceFile }],
    });
  });

});
