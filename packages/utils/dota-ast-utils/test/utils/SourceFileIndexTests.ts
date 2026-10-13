import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSync, type Module } from '@swc/core';
import { SourceFileIndex, type SourceFileLoader } from '../../src/utils/SourceFileIndex.ts';

/**
 * Creates an in-memory loader whose stamps and contents the test controls.
 * @param files Source text by path; stamps default to the text itself.
 * @returns Loader with spies on every file operation.
 */
function createLoader(files: Map<string, string>) {
  return {
    stamp: vi.fn(async (file: string) => files.get(file) ?? ''),
    read: vi.fn(async (file: string) => {
      const source = files.get(file);
      if (source === undefined) throw new Error(`missing ${file}`);
      return source;
    }),
    parse: vi.fn(async (source: string) => parseSync(source, { syntax: 'typescript' }) as Module),
  } satisfies SourceFileLoader;
}

describe('SourceFileIndex', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
  });

  it('parses an unchanged file once across callers and concurrent requests', async () => {
    const loader = createLoader(new Map([['/a.ts', 'export const a = 1;']]));
    const index = new SourceFileIndex(loader);

    const [first, second] = await Promise.all([index.load('/a.ts'), index.load('/a.ts')]);
    const third = await index.load('/a.ts');

    expect(first).toBe(second);
    expect(third).toBe(first);
    expect(first.sourceText).toBe('export const a = 1;');
    expect(loader.read).toHaveBeenCalledOnce();
    expect(loader.parse).toHaveBeenCalledOnce();
  });

  it('parses again when the file stamp changes', async () => {
    const files = new Map([['/a.ts', 'export const a = 1;']]);
    const loader = createLoader(files);
    const index = new SourceFileIndex(loader);

    const before = await index.load('/a.ts');
    files.set('/a.ts', 'export const a = 2;');
    const after = await index.load('/a.ts');

    expect(after).not.toBe(before);
    expect(after.sourceText).toBe('export const a = 2;');
    expect(loader.parse).toHaveBeenCalledTimes(2);
  });

  it('caches each parser setting separately', async () => {
    const loader = createLoader(new Map([['/a.ts', 'export const a = 1;']]));
    const index = new SourceFileIndex(loader);

    await index.load('/a.ts', { syntax: 'typescript', decorators: true });
    await index.load('/a.ts', { syntax: 'typescript', decorators: true, tsx: true });
    await index.load('/a.ts', { syntax: 'typescript', decorators: true });

    expect(loader.parse).toHaveBeenCalledTimes(2);
  });

  it('does not retain failed parses', async () => {
    const loader = createLoader(new Map([['/a.ts', 'export const a = 1;']]));
    const parseError = new Error('parse failed');
    loader.parse.mockRejectedValueOnce(parseError);
    const index = new SourceFileIndex(loader);

    await expect(index.load('/a.ts')).rejects.toBe(parseError);
    await expect(index.load('/a.ts')).resolves.toMatchObject({ sourceFile: '/a.ts' });
    expect(loader.parse).toHaveBeenCalledTimes(2);
  });

  it('returns modules in request order and rejects when any file fails', async () => {
    const loader = createLoader(new Map([['/a.ts', 'const a = 1;'], ['/b.ts', 'const b = 2;']]));
    const index = new SourceFileIndex(loader);

    const modules = await index.loadAll(['/b.ts', '/a.ts']);

    expect(modules.map(module => module.sourceFile)).toEqual(['/b.ts', '/a.ts']);
    await expect(index.loadAll(['/a.ts', '/missing.ts'])).rejects.toThrow('missing /missing.ts');
  });

  it('drops one file or every file on invalidation', async () => {
    const loader = createLoader(new Map([['/a.ts', 'const a = 1;'], ['/b.ts', 'const b = 2;']]));
    const index = new SourceFileIndex(loader);
    await index.loadAll(['/a.ts', '/b.ts']);

    index.invalidate('/a.ts');
    await index.loadAll(['/a.ts', '/b.ts']);
    expect(loader.parse).toHaveBeenCalledTimes(3);

    index.invalidate();
    await index.loadAll(['/a.ts', '/b.ts']);
    expect(loader.parse).toHaveBeenCalledTimes(5);
  });

  it('reads and parses real files by default and shares one process-wide index', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'source-index-'));
    directories.push(directory);
    const file = join(directory, 'component.ts');
    await writeFile(file, '@Component({}) export class Sample {}');

    const module = await new SourceFileIndex().load(file);

    expect(module.ast.body[0]?.type).toBe('ExportDeclaration');
    expect(SourceFileIndex.shared()).toBe(SourceFileIndex.shared());
  });
});
