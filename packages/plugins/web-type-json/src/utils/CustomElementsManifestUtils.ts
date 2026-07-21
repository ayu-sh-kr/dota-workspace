import {isAbsolute, relative, sep} from "node:path";
import type {
  CustomElementsManifestConfig,
  NormalizedCustomElementsManifestConfig,
} from "../Types.ts";

/**
 * Owns configuration and package-path policies specific to CEM generation.
 * Centralizing these checks keeps published module references package-safe while
 * leaving manifest projection and plugin lifecycle orchestration in the entry module.
 */
export class CustomElementsManifestUtils {
  /**
   * Normalizes the opt-in CEM option once for all plugin lifecycle paths.
   * Boolean `true` uses defaults; object configuration requires `enabled: true`,
   * preserving Web Types-only behavior for existing plugin consumers.
   * @param config User-provided Boolean or detailed CEM configuration.
   * @returns Complete generation settings used by builds and watcher refreshes.
   */
  static normalizeConfig(
    config?: boolean | CustomElementsManifestConfig,
  ): NormalizedCustomElementsManifestConfig {
    if (config === true) {
      return {
        enabled: true,
        outFile: "custom-elements.json",
        updatePackageJson: true,
      };
    }

    if (config == null || config === false) {
      return {
        enabled: false,
        outFile: "custom-elements.json",
        updatePackageJson: false,
      };
    }

    return {
      enabled: config.enabled === true,
      outFile: config.outFile ?? "custom-elements.json",
      updatePackageJson: config.enabled === true && (config.updatePackageJson ?? true),
      modulePath: config.modulePath,
    };
  }

  /**
   * Determines whether a component source belongs to the manifest's package root.
   * External scan roots remain available to Web Types but cannot be advertised as
   * importable modules in a manifest owned by another package.
   * @param root Package root that owns the generated manifest.
   * @param sourceFile Absolute component source path.
   * @returns Whether the source resolves within the package root.
   */
  static isPackageOwnedSource(root: string, sourceFile: string): boolean {
    const packageRelativeSource = relative(root, sourceFile);
    return packageRelativeSource !== ".."
      && !packageRelativeSource.startsWith(`..${sep}`)
      && !isAbsolute(packageRelativeSource);
  }

  /**
   * Derives the default published module from a package-owned TypeScript source file.
   * Only the final extension changes because alternate build layouts require an
   * explicit consumer-provided mapper.
   * @param sourceFile Absolute component source path.
   * @param root Package root used as the module-path base.
   * @returns A slash-normalized package-relative JavaScript path.
   */
  static defaultModulePath(sourceFile: string, root: string): string {
    return relative(root, sourceFile)
      .replace(/\\/g, "/")
      .replace(/\.ts$/, ".js");
  }

  /**
   * Validates a CEM module path before it becomes published package metadata.
   * Empty, absolute, or escaping paths would advertise files outside the package
   * that owns the generated manifest and are therefore rejected.
   * @param modulePath Module path returned by the configured or default mapper.
   * @param sourceFile Source file used to produce a useful failure message.
   * @returns A slash-normalized path without a leading `./`.
   * @throws When the mapped path is empty, absolute, or escapes through `..`.
   */
  static normalizeModulePath(modulePath: string, sourceFile: string): string {
    const normalized = modulePath.replace(/\\/g, "/").replace(/^\.\//, "");
    const pathSegments = normalized.split("/");
    if (
      normalized.length === 0
      || normalized.startsWith("/")
      || /^[A-Za-z]:\//.test(normalized)
      || pathSegments.includes("..")
    ) {
      throw new Error(`Invalid Custom Elements Manifest module path for ${sourceFile}: ${modulePath}`);
    }

    return normalized;
  }
}
