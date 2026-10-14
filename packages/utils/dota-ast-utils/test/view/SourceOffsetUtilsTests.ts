import { describe, expect, it } from 'vitest';
import { findModuleSourceOffset, utf8ByteOffsetToSourceOffset } from '../../src/view/SourceOffsetUtils.ts';

describe('SourceOffsetUtils', () => {
  it('locates the first token after whitespace and comments', () => {
    expect(findModuleSourceOffset('\n // note\n /* block */\n export const value = 1;')).toBe(24);
    expect(findModuleSourceOffset('/* unfinished')).toBe(0);
  });

  it('converts UTF-8 byte distances from the supplied module offset', () => {
    expect(utf8ByteOffsetToSourceOffset('  évalue', 2, 2)).toBe(3);
  });

  it('rejects offsets outside the source or inside a multibyte character', () => {
    expect(utf8ByteOffsetToSourceOffset('value', -1, 0)).toBeNull();
    expect(utf8ByteOffsetToSourceOffset('value', 6, 0)).toBeNull();
    expect(utf8ByteOffsetToSourceOffset('é', 0, 1)).toBeNull();
    expect(utf8ByteOffsetToSourceOffset('value', 0, 5)).toBe(5);
  });

  it('skips whitespace and comments before the first token', () => {
    expect(findModuleSourceOffset('  // line\n /* block */ export')).toBe(23);
    expect(findModuleSourceOffset(' \n // only a comment')).toBe(0);
  });

  it('matches a per-character UTF-8 walk for every offset, including astral and unpaired surrogates', () => {
    const sources = ['a\u00e9\u4e2d\ud83d\ude00 b', 'x\ud800y\udc00z', '  export const name = "\u00e9t\u00e9";'];
    for (const source of sources) {
      for (let start = 0; start <= source.length; start += 1) {
        for (let bytes = 0; bytes <= Buffer.byteLength(source.slice(start)) + 1; bytes += 1) {
          expect(utf8ByteOffsetToSourceOffset(source, start, bytes)).toBe(walkUtf8Offset(source, start, bytes));
        }
      }
    }
  });

  it('keeps conversions correct when calls alternate between sources and start offsets', () => {
    expect(utf8ByteOffsetToSourceOffset('\u00e9a', 0, 2)).toBe(1);
    expect(utf8ByteOffsetToSourceOffset('ab', 0, 2)).toBe(2);
    expect(utf8ByteOffsetToSourceOffset('\u00e9a', 1, 1)).toBe(2);
    expect(utf8ByteOffsetToSourceOffset('\u00e9a', 0, 1)).toBeNull();
  });
});

/**
 * Reference conversion that encodes one character at a time, as the original implementation did.
 * @param source Source text to walk.
 * @param start Character index the byte distance is measured from.
 * @param bytes UTF-8 byte distance to convert.
 * @returns Matching source index, or `null` inside a character or past the end.
 */
function walkUtf8Offset(source: string, start: number, bytes: number): number | null {
  const encoder = new TextEncoder();
  let consumed = 0;
  let offset = start;
  for (const character of source.slice(start)) {
    if (consumed === bytes) return offset;
    consumed += encoder.encode(character).byteLength;
    offset += character.length;
    if (consumed > bytes) return null;
  }
  return consumed === bytes ? offset : null;
}
