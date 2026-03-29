import {ModuleItem} from "@swc/core";


export class DeclarationUtils {

  /**
   * Extracts all module items of a specific type from the module body.
   * Works across all ModuleItem subtypes: class/function/variable declarations,
   * import declarations, export declarations, and more.
   *
   * @param items - The top-level module items (ast.body)
   * @param type - The node type discriminant to filter by (e.g. 'ClassDeclaration', 'ImportDeclaration')
   * @returns All items whose type matches the requested type, narrowed to T
   */
  static extractDeclarations<T extends ModuleItem>(items: ModuleItem[], type: T['type']): T[] {
    return items.filter((item): item is T => item.type === type);
  }

  /**
   * Finds the first module item that matches both the given type and identifier name.
   * Useful for locating a specific named declaration (e.g. a class named 'AppComponent').
   *
   * @param items - The top-level module items (ast.body)
   * @param type - The node type discriminant to filter by
   * @param name - The identifier name to match against
   * @returns The first matching item narrowed to T, or null if not found
   */
  static findDeclarationByName<T extends ModuleItem>(items: ModuleItem[], type: T['type'], name: string): T | null {
    const declaration = items.find(item => item.type === type && 'identifier' in item && (item as any).identifier?.value === name);
    return declaration ? declaration as T : null;
  }

  /**
   * Finds the first module item of the specified type in the module body.
   *
   * @param items - The top-level module items (ast.body)
   * @param type - The node type discriminant to filter by
   * @returns The first matching item narrowed to T, or null if not found
   */
  static findFirstDeclaration<T extends ModuleItem>(items: ModuleItem[], type: T['type']): T | null {
    const declaration = items.find(item => item.type === type);
    return declaration ? declaration as T : null;
  }

}