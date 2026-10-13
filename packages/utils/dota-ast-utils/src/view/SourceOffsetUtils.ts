/** Byte-to-index table for the most recently converted source, reused while one file is analyzed. */
type ByteOffsetTable = {
  /** Source string whose offsets the table describes. */
  sourceText: string;
  /** Character index the table's byte distances are measured from. */
  sourceStartOffset: number;
  /** Source index for each byte distance, or `-1` inside a multibyte character. */
  sourceOffsets: Int32Array;
};

let lastByteOffsetTable: ByteOffsetTable | undefined;

/**
 * Converts an SWC UTF-8 byte distance into a JavaScript source-string index.
 * Handles multibyte characters and UTF-16 code units used by editor offsets.
 * Scanners convert many spans of one file in a row, so the byte table for the latest
 * source is kept and each later conversion is a single lookup.
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

  const {sourceOffsets} = resolveByteOffsetTable(sourceText, sourceStartOffset);
  const sourceOffset = relativeByteOffset < sourceOffsets.length ? sourceOffsets[relativeByteOffset] : -1;
  return sourceOffset < 0 ? null : sourceOffset;
}

/**
 * Returns the cached byte table for a source and start offset, building it when either changed.
 * @param sourceText Original source buffer used for the conversion.
 * @param sourceStartOffset Character index the byte distances are measured from.
 * @returns Table mapping every byte distance to its source index.
 */
function resolveByteOffsetTable(sourceText: string, sourceStartOffset: number): ByteOffsetTable {
  if (lastByteOffsetTable?.sourceText === sourceText && lastByteOffsetTable.sourceStartOffset === sourceStartOffset) {
    return lastByteOffsetTable;
  }

  lastByteOffsetTable = {sourceText, sourceStartOffset, sourceOffsets: createByteOffsetTable(sourceText, sourceStartOffset)};
  return lastByteOffsetTable;
}

/**
 * Maps each UTF-8 byte distance from the start offset to its source index in one pass.
 * Unpaired surrogates count as three bytes, matching their `TextEncoder` replacement character.
 * @param sourceText Original source buffer used for the conversion.
 * @param sourceStartOffset Character index the byte distances are measured from.
 * @returns Source index per byte distance, with `-1` for distances inside a character.
 */
function createByteOffsetTable(sourceText: string, sourceStartOffset: number): Int32Array {
  // One UTF-16 code unit never encodes to more than three UTF-8 bytes.
  const sourceOffsets = new Int32Array((sourceText.length - sourceStartOffset) * 3 + 1).fill(-1);
  let bytesConsumed = 0;
  let sourceOffset = sourceStartOffset;

  while (sourceOffset < sourceText.length) {
    sourceOffsets[bytesConsumed] = sourceOffset;
    const codePoint = sourceText.codePointAt(sourceOffset)!;
    bytesConsumed += utf8ByteLength(codePoint);
    sourceOffset += codePoint > 0xffff ? 2 : 1;
  }

  sourceOffsets[bytesConsumed] = sourceOffset;
  return sourceOffsets.subarray(0, bytesConsumed + 1);
}

/**
 * Counts the UTF-8 bytes used to encode one code point.
 * @param codePoint Unicode code point, or an unpaired surrogate.
 * @returns Encoded length between one and four bytes.
 */
function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  return codePoint < 0x10000 ? 3 : 4;
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
