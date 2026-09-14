import {readFile, stat} from 'node:fs/promises';

/** Local response data; HEAD requests carry metadata without a response body. */
export type PrerenderAsset = {content: Buffer | null; size: number};

/** Reads a validated absolute file path, optionally requesting only HEAD metadata. */
export type PrerenderAssetReader = (file: string, head?: boolean) => Promise<PrerenderAsset>;

/**
 * Reuses immutable asset bytes and pending reads within one SSG build.
 * Generated HTML and failed reads are never retained; each reader owns its cache.
 * @param outputs Absolute generated destinations that must always be read afresh.
 * @param maxBytes Retained byte limit, defaulting to 32 MiB; zero disables caching.
 * @returns Reader capped at 256 entries, using metadata for uncached HEAD requests.
 */
export function createPrerenderAssetReader(
  outputs: ReadonlySet<string>,
  maxBytes = 32 * 1024 * 1024
): PrerenderAssetReader {
  const reads = new Map<string, Promise<Buffer>>();
  let retainedBytes = 0;

  return async (file, head = false) => {
    let read = reads.get(file);
    if (!read && head) {
      const metadata = await stat(file);
      if (!metadata.isFile()) {
        throw Object.assign(new Error(`Not a regular file: ${file}`), {code: 'EISDIR'});
      }
      return {content: null, size: metadata.size};
    }
    if (!read) {
      read = readFile(file);
      if (!outputs.has(file) && maxBytes > 0 && reads.size < 256) {
        reads.set(file, read);
        void read.then(content => {
          if (retainedBytes + content.byteLength > maxBytes) {
            reads.delete(file);
          } else {
            retainedBytes += content.byteLength;
          }
        }, () => reads.delete(file));
      }
    }
    const content = await read;
    return {content: head ? null : content, size: content.byteLength};
  };
}
