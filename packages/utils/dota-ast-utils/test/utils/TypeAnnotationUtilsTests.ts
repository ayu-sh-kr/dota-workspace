import { describe, expect, it } from 'vitest';
import { parseSync, type Module, type TsType, type TsTypeAnnotation, type VariableDeclarator } from '@swc/core';
import { AstTraversalUtils } from '../../src/utils/AstTraversalUtils.ts';
import { TypeAnnotationUtils } from '../../src/utils/TypeAnnotationUtils.ts';

describe('TypeAnnotationUtils', () => {
  it('preserves complex annotation text and collects root imported names', () => {
    const source = `const value: Api.Result<ThemeName | { id: Identifier }> = null!;`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const declarator = AstTraversalUtils.findNodes<VariableDeclarator>(ast, 'VariableDeclarator')[0];
    const annotation = declarator?.id.type === 'Identifier'
      ? (declarator.id as { typeAnnotation?: unknown }).typeAnnotation
      : null;
    if (annotation == null) throw new Error('Expected a variable annotation.');

    expect(TypeAnnotationUtils.read(annotation as TsTypeAnnotation, source, ast.span.start)).toEqual({
      text: 'Api.Result<ThemeName | { id: Identifier }>',
      referencedNames: ['Api', 'Identifier', 'ThemeName'],
    });
  });

  it('accepts a raw type node and sorts unique root references', () => {
    const source = `const value: Zed | Api.Result<Zed> = null;`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const declarator = AstTraversalUtils.findNodes<VariableDeclarator>(ast, 'VariableDeclarator')[0];
    const annotation = declarator?.id.type === 'Identifier'
      ? (declarator.id as { typeAnnotation?: TsTypeAnnotation }).typeAnnotation?.typeAnnotation
      : null;

    if (annotation == null) {
      throw new Error('Expected a raw type annotation.');
    }

    expect(TypeAnnotationUtils.read(annotation, source, ast.span.start)).toEqual({
      text: 'Zed | Api.Result<Zed>',
      referencedNames: ['Api', 'Zed'],
    });
  });

  it('returns null when the type span cannot produce a source slice', () => {
    const invalidType = {
      type: 'TsKeywordType',
      span: { start: 4, end: 4 },
      kind: 'string',
    } as unknown as TsType;

    expect(TypeAnnotationUtils.read(invalidType, 'text', 0, 0)).toBeNull();
  });
});
