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
