/**
 * Converts an SWC UTF-8 byte distance into a JavaScript source-string index.
 * Handles multibyte characters and UTF-16 code units used by editor offsets.
 * @param sourceText Original source buffer used for the conversion.
 * @param sourceStartOffset Character index represented by the module span start.
 * @param relativeByteOffset SWC byte distance from the module span start.
 * @returns The corresponding source-string index, or `null` for an invalid boundary.
 */
export function utf8ByteOffsetToSourceOffset(
  sourceText: string,
  sourceStartOffset: number,
  relativeByteOffset: number,
): number | null {
  if (relativeByteOffset < 0 || sourceStartOffset < 0 || sourceStartOffset > sourceText.length) {
    return null;
  }

  const encoder = new TextEncoder();
  let bytesConsumed = 0;
  let sourceOffset = sourceStartOffset;

  for (const character of sourceText.slice(sourceStartOffset)) {
    if (bytesConsumed === relativeByteOffset) {
      return sourceOffset;
    }

    bytesConsumed += encoder.encode(character).byteLength;
    sourceOffset += character.length;

    if (bytesConsumed > relativeByteOffset) {
      return null;
    }
  }

  return bytesConsumed === relativeByteOffset ? sourceOffset : null;
}

/**
 * Finds the source index represented by SWC's module-span start.
 * SWC anchors a module at its first parsed token, so leading whitespace and
 * comments must be skipped before converting module-relative byte spans.
 * @param sourceText - Original source buffer whose first token is located.
 * @returns The first parsed-token index, or zero for an empty/comment-only file.
 */
export function findModuleSourceOffset(sourceText: string): number {
  let offset = 0;

  while (offset < sourceText.length) {
    if (/\s/.test(sourceText[offset] ?? '')) {
      offset += 1;
      continue;
    }

    if (sourceText.startsWith('//', offset)) {
      const lineEnd = sourceText.indexOf('\n', offset + 2);
      offset = lineEnd === -1 ? sourceText.length : lineEnd + 1;
      continue;
    }

    if (sourceText.startsWith('/*', offset)) {
      const commentEnd = sourceText.indexOf('*/', offset + 2);
      offset = commentEnd === -1 ? sourceText.length : commentEnd + 2;
      continue;
    }

    return offset;
  }

  return 0;
}
