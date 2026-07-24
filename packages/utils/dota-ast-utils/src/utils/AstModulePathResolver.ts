import {dirname, extname, resolve} from 'node:path';
import type {AstModuleIndex, AstModuleResolutionOptions, AstPathAlias} from '@dota/Types.ts';

/** Resolves source import specifiers only against the caller-provided module index. */
export class AstModulePathResolver {
  /**
   * Finds the one indexed module represented by an import specifier.
   * Relative paths and normalized aliases share extension probing rules; ambiguous matches
   * return `null` instead of selecting by filesystem order.
   * @param sourceFile Absolute importing module path.
   * @param specifier Module specifier written by the source file.
   * @param index Parsed modules that form the allowed filesystem boundary.
   * @param options Alias and extension settings.
   * @returns A normalized indexed module path, or `null` when it cannot be proven.
   */
  static resolve(sourceFile: string, specifier: string, index: AstModuleIndex, options: AstModuleResolutionOptions = {}): string | null {
    const candidates = this.findCandidates(sourceFile, specifier, index, options);
    return candidates.length === 1 ? candidates[0] : null;
  }

  /**
   * Lists indexed matches without selecting an ambiguous target.
   * The resolver uses this to distinguish missing and ambiguous imports while keeping
   * the caller's parsed module set as the complete filesystem boundary.
   * @param sourceFile Absolute importing module path.
   * @param specifier Module specifier written by the source file.
   * @param index Parsed modules that form the allowed filesystem boundary.
   * @param options Alias and extension settings.
   * @returns Sorted unique normalized module paths matching the specifier.
   */
  static findCandidates(sourceFile: string, specifier: string, index: AstModuleIndex, options: AstModuleResolutionOptions = {}): string[] {
    const base = this.resolveBasePath(sourceFile, specifier, options.aliases ?? []);
    if (base == null) return [];

    const candidates = this.createPathCandidates(base, this.normalizeExtensions(options.extensions))
      .map(candidate => this.normalizeSourceFile(candidate))
      .filter(candidate => index.has(candidate));
    return [...new Set(candidates)].sort((left, right) => left.localeCompare(right));
  }

  /**
   * Converts a relative or alias import into a filesystem base path.
   * Bare package names remain unresolved unless the caller explicitly maps them.
   * @param sourceFile Absolute importing module path.
   * @param specifier Module specifier written by the source file.
   * @param aliases Normalized alias mappings supplied by a scanner or build tool.
   * @returns Base path before extension probing, or `null` for unmapped specifiers.
   */
  private static resolveBasePath(sourceFile: string, specifier: string, aliases: AstPathAlias[]): string | null {
    if (specifier.startsWith('.')) return resolve(dirname(sourceFile), specifier);

    const matchingAlias = [...aliases]
      .sort((left, right) => right.find.length - left.find.length)
      .find(alias => this.matchesAlias(alias, specifier));
    if (matchingAlias == null) return null;

    if (matchingAlias.kind === 'exact') return resolve(matchingAlias.replacement);
    if (matchingAlias.kind === 'wildcard') {
      const [prefix, suffix = ''] = matchingAlias.find.split('*');
      const wildcardValue = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
      return resolve(matchingAlias.replacement.replace('*', wildcardValue));
    }

    const suffix = specifier.slice(matchingAlias.find.length).replace(/^\//, '');
    return resolve(matchingAlias.replacement, suffix);
  }

  /**
   * Checks one exact, prefix, or wildcard alias without interpreting regular expressions.
   * Regex aliases need a caller-owned adapter to remain deterministic and are not accepted here.
   * @param alias Normalized alias mapping.
   * @param specifier Source import specifier.
   * @returns Whether the alias can represent the specifier.
   */
  private static matchesAlias(alias: AstPathAlias, specifier: string): boolean {
    if (alias.kind === 'exact') return specifier === alias.find;
    if (alias.kind === 'wildcard') {
      const [prefix, suffix = ''] = alias.find.split('*');
      return specifier.startsWith(prefix) && specifier.endsWith(suffix)
        && specifier.length >= prefix.length + suffix.length;
    }

    return specifier === alias.find || specifier.startsWith(`${alias.find}/`);
  }

  /**
   * Produces file and index candidates in stable order for an extensionless import.
   * Explicit supported extensions are treated as files instead of being rewritten.
   * @param base Filesystem base path after relative or alias mapping.
   * @param extensions Normalized source extensions to probe.
   * @returns Candidate file paths before index filtering.
   */
  private static createPathCandidates(base: string, extensions: string[]): string[] {
    const explicitExtension = extname(base);
    if (explicitExtension !== '' && extensions.includes(explicitExtension)) return [base];
    if (explicitExtension !== '') return [];

    return [
      base,
      ...extensions.map(extension => `${base}${extension}`),
      ...extensions.map(extension => resolve(base, `index${extension}`)),
    ];
  }

  /**
   * Normalizes extensions once so callers can pass `ts` or `.ts` consistently.
   * @param extensions Configured source suffixes.
   * @returns Unique non-empty extensions with a leading dot.
   */
  private static normalizeExtensions(extensions: string[] | undefined): string[] {
    const normalized = (extensions ?? ['.ts'])
      .map(extension => extension.trim())
      .filter(Boolean)
      .map(extension => extension.startsWith('.') ? extension : `.${extension}`)
      .filter(Boolean);
    return [...new Set(normalized.length > 0 ? normalized : ['.ts'])];
  }

  /**
   * Uses the same normalized path representation as the module index.
   * @param sourceFile Source path from discovery or import mapping.
   * @returns Absolute normalized source path.
   */
  private static normalizeSourceFile(sourceFile: string): string {
    return resolve(sourceFile).replace(/\\/g, '/');
  }
}
