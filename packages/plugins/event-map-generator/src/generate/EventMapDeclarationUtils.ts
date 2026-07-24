import { dirname, relative, resolve } from 'node:path';
import { EventMapModuleConstants } from '@dota/Constants.ts';
import type {
  EventMapDeclarationArtifact,
  EventMapDeclarationOptions,
  EventMapPayloadType,
  EventMapScanCandidate,
  EventMapTypeImport,
} from '@dota/Types.ts';

const DECLARATION_GUIDANCE_LINES = [
  '// Auto-generated application event map. Do not edit by hand.',
  '// Payload types are recovered syntactically from publish, publishAsync, and emit calls.',
  '// Unsupported publisher expressions become unknown; decorator-only events remain any for compatibility.',
] as const;

/**
 * Holds the declaration utility's single resolved payload for one event key.
 * It is created after candidate merging so rendering never repeats conflict resolution.
 */
type EventMapDeclarationEntry = {
  name: string;
  payload: EventMapPayloadType;
};

/**
 * Serializes scanned event metadata into the declaration consumed by the event bus.
 * It keeps filesystem and Vite concerns outside this pure policy class, chooses
 * one payload per key, emits type-only imports, and rejects incompatible contracts.
 */
export class EventMapDeclarationUtils {
  /**
   * Builds a deterministic module augmentation from the scanner's raw observations.
   * Entries are grouped and sorted, complete payloads win over incomplete evidence,
   * and imports are rebased from source files when an output path is provided.
   * @param candidates Event keys and syntactically recovered payload observations.
   * @param options Target module plus optional generated-file path for relative imports.
   * @returns Declaration source and the sorted event names represented in its body.
   * @throws If one key has multiple distinct payloads marked fully resolved.
   */
  static createDeclaration(candidates: EventMapScanCandidate[], options: EventMapDeclarationOptions = { moduleSpecifier: EventMapModuleConstants.DEFAULT_MODULE_SPECIFIER }): EventMapDeclarationArtifact {
    const entries = this.createEntries(candidates);
    const imports = this.createImportLines(entries.flatMap(entry => entry.payload.imports), options.outFile);
    const body = entries.length === 0
      ? '    // No application events have been discovered yet.'
      : entries.map(entry => `    ${JSON.stringify(entry.name)}: ${entry.payload.text};`).join('\n');

    return {
      names: entries.map(entry => entry.name),
      declaration: [
        'export {};',
        ...(imports.length === 0 ? [] : ['', ...imports]),
        '',
        ...DECLARATION_GUIDANCE_LINES,
        '',
        `declare module ${JSON.stringify(options.moduleSpecifier)} {`,
        '  interface ApplicationEventMap {',
        body,
        '  }',
        '}',
        '',
      ].join('\n'),
    };
  }

  /**
   * Groups observations by event key before the declaration body is assembled.
   * Grouping preserves keys seen only in decorators, while payload selection is
   * delegated so conflict and incomplete-evidence rules remain in one policy method.
   * @param candidates Raw observations collected from every configured source root.
   * @returns One sorted entry per key; payload imports remain attached to that entry.
   * @throws When a key's fully resolved payload observations conflict.
   */
  private static createEntries(candidates: EventMapScanCandidate[]): EventMapDeclarationEntry[] {
    const groupedCandidates = new Map<string, EventMapScanCandidate[]>();
    candidates.forEach(candidate => {
      const grouped = groupedCandidates.get(candidate.name) ?? [];
      grouped.push(candidate);
      groupedCandidates.set(candidate.name, grouped);
    });

    return [...groupedCandidates.entries()]
      .map(([name, grouped]) => {
        const payload = this.resolvePayload(name, grouped);
        return { name, payload };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  /**
   * Merges all observations for one key into the payload emitted to TypeScript.
   * A complete payload is authoritative; otherwise the longest incomplete shape
   * preserves the most available information, and distinct complete texts fail fast.
   * @param name Event key used in the conflict diagnostic.
   * @param candidates Decorator and publisher observations for that key.
   * @returns The authoritative payload, or the richest safe fallback when unresolved.
   * @throws When two or more complete payload texts disagree for the key.
   */
  private static resolvePayload(name: string, candidates: EventMapScanCandidate[]): EventMapPayloadType {
    const payloads = candidates.map(candidate => candidate.payload ?? { text: 'unknown', isComplete: false, imports: [] });
    const completePayloads = [...new Map(payloads
      .filter(payload => payload.isComplete)
      .map(payload => [payload.text, payload] as const)).values()];

    if (completePayloads.length > 1) {
      throw new Error(`Conflicting payload types for ${JSON.stringify(name)}: ${completePayloads.map(payload => payload.text).join(', ')}`);
    }

    if (completePayloads[0] != null) {
      return completePayloads[0];
    }

    return [...payloads].sort((left, right) => right.text.length - left.text.length || left.text.localeCompare(right.text))[0]
      ?? { text: 'unknown', isComplete: false, imports: [] };
  }

  /**
   * Converts selected payload references into stable type-only import statements.
   * Module groups and imported names are sorted and deduplicated so regeneration
   * does not churn; relative paths are rebased only when the output location is known.
   * @param imports Imported symbols required by the selected payload entries.
   * @param outFile Generated declaration path, or `undefined` to retain source specifiers.
   * @returns Sorted import lines without duplicate module/name pairs.
   */
  private static createImportLines(imports: EventMapTypeImport[], outFile: string | undefined): string[] {
    const importsByModule = new Map<string, Set<string>>();

    imports.forEach(typeImport => {
      const moduleSpecifier = this.normalizeModuleSpecifier(typeImport, outFile);
      const names = importsByModule.get(moduleSpecifier) ?? new Set<string>();
      names.add(typeImport.name);
      importsByModule.set(moduleSpecifier, names);
    });

    return [...importsByModule.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([moduleSpecifier, names]) => `import type { ${[...names].sort((left, right) => left.localeCompare(right)).join(', ')} } from ${JSON.stringify(moduleSpecifier)};`);
  }

  /**
   * Rebases one source-relative type import from its owner file to the output file.
   * Bare package and alias specifiers remain unchanged because they are already
   * interpreted from the generated declaration's TypeScript project context.
   * @param typeImport Symbol and original module path recorded by the scanner.
   * @param outFile Generated declaration path; when absent, no rebasing is possible.
   * @returns A declaration-local relative path or the original module specifier.
   */
  private static normalizeModuleSpecifier(typeImport: EventMapTypeImport, outFile: string | undefined): string {
    if (!typeImport.moduleSpecifier.startsWith('.') || outFile == null) {
      return typeImport.moduleSpecifier;
    }

    const target = resolve(dirname(typeImport.sourceFile), typeImport.moduleSpecifier);
    const rebased = relative(dirname(outFile), target).replaceAll('\\', '/');
    return rebased.startsWith('.') ? rebased : `./${rebased}`;
  }
}
