import {readFile, stat} from 'node:fs/promises';
import {parse, type ParseOptions} from '@swc/core';
import type {ParsedAstModule} from '@dota/Types.ts';

/** SWC parser settings used by Dota source scanners. */
export type SourceParseOptions = Extract<ParseOptions, {syntax: 'typescript'}>;

/** Default parser settings shared by the Dota component, route, and event scanners. */
export const DEFAULT_SOURCE_PARSE_OPTIONS: SourceParseOptions = {syntax: 'typescript', decorators: true};

/**
 * File operations behind the index. Tests replace them to control reads and parse failures.
 */
export type SourceFileLoader = {
  /** Returns a value that changes whenever the file's contents may have changed. */
  stamp: (file: string) => Promise<string>;
  /** Reads the file as UTF-8 text. */
  read: (file: string) => Promise<string>;
  /** Parses source text into an SWC module. */
  parse: (sourceText: string, options: SourceParseOptions) => Promise<ParsedAstModule['ast']>;
};

/** One cached parse and the file stamp it was produced from. */
type SourceFileEntry = {
  stamp: string;
  module: Promise<ParsedAstModule>;
};

const NODE_SOURCE_FILE_LOADER: SourceFileLoader = {
  stamp: async file => {
    const {mtimeMs, size} = await stat(file);
    return `${mtimeMs}:${size}`;
  },
  read: file => readFile(file, 'utf8'),
  parse: (sourceText, options) => parse(sourceText, options),
};

let sharedSourceFileIndex: SourceFileIndex | undefined;

/**
 * Reads and parses each source file once for every scanner that asks for it.
 * Entries are keyed by absolute path and parser settings and are reused while the file's
 * modification time and size are unchanged, so watchers need no shared invalidation.
 * Concurrent requests for the same file share one parse; failed parses are not retained.
 * Returned modules are shared between callers and must be treated as read-only.
 */
export class SourceFileIndex {
  private readonly entries = new Map<string, SourceFileEntry>();

  /**
   * @param loader File operations; defaults to Node's file system and SWC.
   */
  constructor(private readonly loader: SourceFileLoader = NODE_SOURCE_FILE_LOADER) {}

  /**
   * Returns the process-wide index used by the Dota Vite plugins, so the plugins of one
   * build, and the prerender server started after it, parse each unchanged file once.
   * @returns The shared index, created on first use.
   */
  static shared(): SourceFileIndex {
    sharedSourceFileIndex ??= new SourceFileIndex();
    return sharedSourceFileIndex;
  }

  /**
   * Returns the parsed module for one file, parsing it only when it is new or has changed.
   * @param file Absolute source path.
   * @param options SWC parser settings; different settings are cached separately.
   * @returns The file path, its text, and its SWC module.
   * @throws When the file cannot be read or parsed.
   */
  async load(file: string, options: SourceParseOptions = DEFAULT_SOURCE_PARSE_OPTIONS): Promise<ParsedAstModule> {
    const key = `${JSON.stringify(options)}\0${file}`;
    const stamp = await this.loader.stamp(file);
    const cached = this.entries.get(key);
    if (cached?.stamp === stamp) return cached.module;

    const entry: SourceFileEntry = {stamp, module: this.parseFile(file, options)};
    this.entries.set(key, entry);
    entry.module.catch(() => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
    });
    return entry.module;
  }

  /**
   * Loads several files concurrently; SWC parses them on its own thread pool.
   * @param files Absolute source paths.
   * @param options SWC parser settings applied to every file.
   * @returns Parsed modules in the order of `files`.
   * @throws The first read or parse failure to settle.
   */
  loadAll(files: readonly string[], options: SourceParseOptions = DEFAULT_SOURCE_PARSE_OPTIONS): Promise<ParsedAstModule[]> {
    return Promise.all(files.map(file => this.load(file, options)));
  }

  /**
   * Drops cached parses for one file under every parser setting, or for all files.
   * Watchers call it when a file is removed, so deleted sources are not retained.
   * @param file Absolute source path; omit to clear the whole index.
   */
  invalidate(file?: string): void {
    if (file === undefined) {
      this.entries.clear();
      return;
    }

    for (const key of this.entries.keys()) {
      if (key.endsWith(`\0${file}`)) this.entries.delete(key);
    }
  }

  /**
   * Reads and parses one file without consulting the cache.
   * @param file Absolute source path.
   * @param options SWC parser settings.
   * @returns The parsed module for the file's current contents.
   */
  private async parseFile(file: string, options: SourceParseOptions): Promise<ParsedAstModule> {
    const sourceText = await this.loader.read(file);
    return {sourceFile: file, sourceText, ast: await this.loader.parse(sourceText, options)};
  }
}
