import type {ClassDeclaration} from "@swc/core";
import {utf8ByteOffsetToSourceOffset} from "./SourceOffsetUtils.ts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Behavior-focused wrapper around a single class declaration node.
 *
 * The view keeps declaration-specific helpers together so callers can derive
 * stable editor/navigation metadata without poking at SWC internals directly.
 */
export class ClassView {
  constructor(private readonly classDeclaration: ClassDeclaration) {}

  /** Creates a view for the given class declaration node. */
  static from(classDeclaration: ClassDeclaration): ClassView {
    return new ClassView(classDeclaration);
  }

  /** Returns the class name when available. */
  className(): string | null {
    return this.classDeclaration.identifier?.value ?? null;
  }

  /**
   * Returns the class identifier offset for editor and generated-metadata navigation.
   * Normalizes SWC's process-global UTF-8 span against the parsed module when context is given,
   * then falls back to source matching or the raw span for AST-only callers.
   * @param sourceText Optional original source used to convert byte positions and recover offsets.
   * @param sourceStart Optional SWC module span start for global-position normalization.
   * @param sourceStartOffset Local source index represented by `sourceStart`; defaults to zero.
   * @returns A file-relative class identifier offset, or `null` when no location is available.
   */
  getSourceOffset(sourceText?: string, sourceStart?: number, sourceStartOffset = 0): number | null {
    const identifierSpan = this.classDeclaration.identifier?.span;
    if (identifierSpan && typeof identifierSpan.start === "number") {
      if (typeof sourceStart === "number") {
        const relativeByteOffset = identifierSpan.start - sourceStart;
        if (sourceText != null) {
          const sourceOffset = utf8ByteOffsetToSourceOffset(
            sourceText,
            sourceStartOffset,
            relativeByteOffset,
          );
          if (sourceOffset != null && sourceOffset < sourceText.length) {
            return sourceOffset;
          }
        } else if (relativeByteOffset >= 0) {
          return sourceStartOffset + relativeByteOffset;
        }
      } else if (sourceText == null || identifierSpan.start <= sourceText.length) {
        return identifierSpan.start;
      }
    }

    if (sourceText != null) {
      const className = this.classDeclaration.identifier?.value;
      if (className) {
        const classPattern = new RegExp(`\\bclass\\s+${escapeRegExp(className)}\\b`);
        const match = sourceText.match(classPattern);
        if (match?.index != null) {
          return match.index + match[0].indexOf(className);
        }
      }
    }

    const classSpan = this.classDeclaration.span;
    if (sourceText == null && classSpan && typeof classSpan.start === "number") {
      return classSpan.start;
    }

    return null;
  }
}
