import {relative} from "node:path";

export class ComponentUtils {

  /**
   * Determines whether a given file path is a Dota component file.
   * When root is provided, converts the absolute path to a root-relative path
   * and additionally verifies the file lives under src/ (or src/pages/ for pages).
   * Without root, falls back to a filename-only pattern check.
   *
   * Matches:
   *  - src/** /*.component.ts  (SOURCE_ROOT_DIRECTORY_SCAN_PATH)
   *  - src/pages/** /*.page.ts (SOURCE_PAGE_DIRECTORY_SCAN_PATH)
   *
   * @param file - The file path (absolute when root is supplied, relative otherwise)
   * @param root - Optional plugin root directory used to compute a relative path
   * @returns true if the file belongs to any of the component scan paths
   */
  static isComponentFile(file: string, root?: string): boolean {
    if (root) {
      const rel = relative(root, file).replace(/\\/g, '/');
      return (
        (rel.startsWith('src/') && rel.endsWith('.component.ts')) ||
        (rel.startsWith('src/pages/') && rel.endsWith('.page.ts'))
      );
    }
    return /\.component\.ts$/.test(file) || /\.page\.ts$/.test(file);
  }
}