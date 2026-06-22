import type {ClassDeclaration} from "@swc/core";

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
   * Returns a stable source offset for editor navigation.
   *
   * Prefer the class identifier position because it is the narrowest anchor
   * for go-to-declaration. Fall back to the raw source text when the span is
   * clearly not file-local, then fall back to the declaration span.
   */
  getSourceOffset(sourceText?: string): number | null {
    return this.determineSourceOffset(sourceText);
  }

  private determineSourceOffset(sourceText?: string): number | null {
    const identifierSpan = this.classDeclaration.identifier?.span;
    if (identifierSpan && typeof identifierSpan.start === "number") {
      if (sourceText == null || identifierSpan.start <= sourceText.length) {
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
    if (classSpan && typeof classSpan.start === "number") {
      return classSpan.start;
    }

    return null;
  }
}
