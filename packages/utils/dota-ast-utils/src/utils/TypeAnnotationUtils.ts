import type { TsType, TsTypeAnnotation } from '@swc/core';
import { findModuleSourceOffset, utf8ByteOffsetToSourceOffset } from '../view/SourceOffsetUtils.ts';

/** Type text and imported names discovered while reading a TypeScript annotation. */
export type TypeAnnotationInfo = {
  text: string;
  referencedNames: string[];
};

/**
 * Reads TypeScript annotations from their original source representation.
 * Preserving the source text keeps complex generics, unions, and mapped types
 * intact without requiring a type checker or a partial AST-to-TypeScript printer.
 */
export class TypeAnnotationUtils {
  /**
   * Extracts printable type text and referenced root type names from an annotation.
   * @param annotation - A type node or its surrounding `TsTypeAnnotation` wrapper.
   * @param sourceText - Original source text used to preserve exact TypeScript syntax.
   * @param moduleStart - SWC module span start used to normalize byte offsets.
   * @param moduleSourceOffset - Source index represented by the module span start.
   * @returns Source type text and the identifiers that may require type imports.
   */
  static read(annotation: TsType | TsTypeAnnotation, sourceText: string, moduleStart: number, moduleSourceOffset = findModuleSourceOffset(sourceText)): TypeAnnotationInfo | null {
    const type = annotation.type === 'TsTypeAnnotation' ? annotation.typeAnnotation : annotation;
    const start = utf8ByteOffsetToSourceOffset(sourceText, moduleSourceOffset, type.span.start - moduleStart);
    const end = utf8ByteOffsetToSourceOffset(sourceText, moduleSourceOffset, type.span.end - moduleStart);

    if (start == null || end == null || start >= end) {
      return null;
    }

    return {
      text: sourceText.slice(start, end).trim(),
      referencedNames: [...this.collectReferencedNames(type)].sort((left, right) => left.localeCompare(right)),
    };
  }

  /**
   * Collects root identifiers used by type references while walking one type node.
   * Qualified references contribute only their root because `Namespace.Member`
   * imports the namespace binding, not the member name.
   * @param type - Type node whose references should be collected.
   * @returns Unique root identifiers in discovery order.
   */
  private static collectReferencedNames(type: TsType): Set<string> {
    const names = new Set<string>();

    const visit = (node: unknown): void => {
      if (node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      const typedNode = node as Record<string, unknown>;
      if (typedNode.type === 'TsTypeReference') {
        const typeName = typedNode.typeName as Record<string, unknown> | undefined;
        const rootName = this.rootTypeName(typeName);
        if (rootName != null) names.add(rootName);
      }

      Object.values(typedNode).forEach(visit);
    };

    visit(type);
    return names;
  }

  /** Returns the importable root identifier from an SWC type-name node. */
  private static rootTypeName(typeName: Record<string, unknown> | undefined): string | null {
    if (typeName?.type === 'Identifier' && typeof typeName.value === 'string') {
      return typeName.value;
    }

    if (typeName?.type === 'TsQualifiedName') {
      return this.rootTypeName(typeName.left as Record<string, unknown> | undefined);
    }

    return null;
  }
}
