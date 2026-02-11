import {
  Argument,
  ClassDeclaration,
  Decorator,
  ExportDeclaration,
  KeyValueProperty,
  ModuleItem, ObjectExpression
} from "@swc/core";


export class ASTHelperUtils {

  static getExportDeclarations(body: ModuleItem[]): ExportDeclaration[] {
    return body.filter(item => item.type === 'ExportDeclaration');
  }

  static getClassDeclarations(nodes: ExportDeclaration[]): ClassDeclaration[] {
    return nodes.filter(item => item.declaration.type === 'ClassDeclaration')
      .map(item => item.declaration as ClassDeclaration);
  }

  static getDecorators(classDecl: ClassDeclaration): Decorator[] {
    return classDecl.decorators || [];
  }

  static getClassName(classDecl: ClassDeclaration): string | null {
    if (classDecl.identifier) {
      return classDecl.identifier.value;
    }

    return null
  }

  static getDecoratorName(decorator: Decorator): string | null {
    if (decorator.expression.type === 'CallExpression') {
      const callee = decorator.expression.callee;
      if (callee.type === 'Identifier') {
        return callee.value;
      }
    }

    if (decorator.expression.type === 'Identifier') {
      return decorator.expression.value;
    }

    return null;
  }

  static getDecoratorArguments(decorator: Decorator): Argument[] {
    if (decorator.expression.type === 'CallExpression') {
      return decorator.expression.arguments;
    }

    return [];
  }

  static getKeyValuePropertyFromObject(expression: ObjectExpression, fieldName: string): KeyValueProperty | null {
    for (const prop of expression.properties) {
      if (
        prop.type === 'KeyValueProperty' &&
        prop.key.type === 'Identifier' &&
        prop.key.value === fieldName
      ) {
        return prop;
      }
    }
    return null
  }

}