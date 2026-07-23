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
});
