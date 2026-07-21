import {isAbsolute, relative, sep} from "node:path";

/**
 * Provides source-path and source-text policies shared by component scanning.
 * These operations are stateless and belong together because they translate raw
 * source inputs into the package-relative locations consumed by generated metadata.
 */
export class ComponentSourceUtils {
  /**
   * Converts an absolute source path into the slash-normalized path Web Types expects.
   * The explicit `./` prefix keeps generated navigation paths package-relative.
   * @param root Package root used as the source-path base.
   * @param file Absolute source file path discovered during scanning.
   * @returns A package-relative path suitable for Web Types source navigation.
   */
  static toWebTypesSourceFile(root: string, file: string): string {
    const relativePath = relative(root, file).split(sep).join("/");
    return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
  }

  /**
   * Finds the local source index represented by SWC's module span start.
   * SWC anchors the module at its first parsed token, so leading whitespace and
   * comments must be excluded when translating parser spans into source offsets.
   * @param sourceText Original source file contents.
   * @returns The first token index, or zero when the source has no token.
   */
  static findModuleSourceOffset(sourceText: string): number {
    let offset = 0;

    while (offset < sourceText.length) {
      if (/\s/.test(sourceText[offset] ?? "")) {
        offset += 1;
        continue;
      }

      if (sourceText.startsWith("//", offset)) {
        const lineEnd = sourceText.indexOf("\n", offset + 2);
        offset = lineEnd === -1 ? sourceText.length : lineEnd + 1;
        continue;
      }

      if (sourceText.startsWith("/*", offset)) {
        const commentEnd = sourceText.indexOf("*/", offset + 2);
        offset = commentEnd === -1 ? sourceText.length : commentEnd + 2;
        continue;
      }

      return offset;
    }

    return 0;
  }

  /**
   * Limits watcher-triggered rescans to source files that can define web components.
   * Paths under any configured scan root are accepted so external library changes
   * refresh an app-level aggregate as well as package-local component metadata.
   * @param file Absolute or watcher-provided path to inspect.
   * @param scanRoots Roots participating in component generation.
   * @returns Whether the file matches a supported component or page convention.
   */
  static isScannableComponentFile(file: string, scanRoots: string[]): boolean {
    return scanRoots.some(scanRoot => {
      const relativePath = relative(scanRoot, file).replace(/\\/g, "/");
      if (relativePath === ".." || relativePath.startsWith("../") || isAbsolute(relativePath)) {
        return false;
      }

      return (
        (relativePath.startsWith("src/") && relativePath.endsWith(".component.ts"))
        || (relativePath.startsWith("src/pages/") && relativePath.endsWith(".page.ts"))
      );
    });
  }
}
