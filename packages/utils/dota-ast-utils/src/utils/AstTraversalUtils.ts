/** Minimal structural contract shared by SWC nodes that can be traversed. */
export type AstNode = { type: string };

/**
 * Performs defensive, syntax-only node discovery for consumers that need a
 * node category not yet represented by the fluent declaration queries. The
 * traversal never evaluates source and ignores primitive metadata fields.
 */
export class AstTraversalUtils {
  /**
   * Finds every node with one SWC discriminant in source traversal order.
   * @param root - Module or nested AST node from which discovery begins.
   * @param type - SWC node discriminant to collect, such as `CallExpression`.
   * @returns Matching nodes in the order they occur in the AST.
   */
  static findNodes<T extends AstNode>(root: unknown, type: T['type']): T[] {
    const nodes: T[] = [];

    const visit = (node: unknown): void => {
      if (node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      const typedNode = node as Record<string, unknown>;
      if (typedNode.type === type) {
        nodes.push(typedNode as T);
      }

      Object.values(typedNode).forEach(visit);
    };

    visit(root);
    return nodes;
  }

  /**
   * Collects nodes of several SWC discriminants in one traversal.
   * Use it instead of repeated `findNodes` calls over the same tree; each list keeps source order.
   * @param root - Module or nested AST node from which discovery begins.
   * @param types - SWC node discriminants to collect.
   * @returns Matching nodes per requested discriminant, with an empty list for absent types.
   */
  static findNodesByType<T extends AstNode>(root: unknown, types: readonly T['type'][]): Map<T['type'], T[]> {
    const nodesByType = new Map<T['type'], T[]>(types.map(type => [type, []]));

    const visit = (node: unknown): void => {
      if (node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }

      const typedNode = node as Record<string, unknown>;
      nodesByType.get(typedNode.type as T['type'])?.push(typedNode as T);
      Object.values(typedNode).forEach(visit);
    };

    visit(root);
    return nodesByType;
  }
}
