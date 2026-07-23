import { relative, sep } from 'node:path';
import type {
  EventMapLocationArtifact,
  EventMapLocationEntry,
  EventMapLocationGenerationOptions,
  EventMapScanCandidate,
  EventMapSourceLocation,
} from '@dota/Types.ts';

/** Builds the optional source-navigation document from scanner occurrences. */
export class EventMapLocationUtils {
  /**
   * Groups source occurrences by event key and separates publication from listening sites.
   * Root-relative paths keep the generated JSON portable while source offsets remain exact.
   * @param candidates Scanner observations, including locations when collection was enabled.
   * @param options Package root used to normalize absolute source paths.
   * @returns A deterministically ordered JSON-ready location document.
   */
  static createArtifact(
    candidates: EventMapScanCandidate[],
    options: EventMapLocationGenerationOptions,
  ): EventMapLocationArtifact {
    const entries = new Map<string, EventMapLocationEntry>();

    candidates.forEach(candidate => {
      const entry = entries.get(candidate.name) ?? {
        key: candidate.name,
        published: [],
        listened: [],
      };
      const target = candidate.kind === 'publish' ? entry.published : entry.listened;

      candidate.locations?.forEach(location => {
        target.push(this.normalizeLocation(location, options.root));
      });
      entries.set(candidate.name, entry);
    });

    return {
      events: [...entries.values()]
        .map(entry => ({
          ...entry,
          published: this.sortLocations(entry.published),
          listened: this.sortLocations(entry.listened),
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    };
  }

  /**
   * Converts a scanner-owned absolute file path into a slash-normalized project path.
   * The explicit `./` prefix makes the generated location file usable from the root.
   * @param location Scanner location with an absolute source file path.
   * @param root Package root used as the relative-path base.
   * @returns A location whose file path is portable within the generated project.
   */
  private static normalizeLocation(location: EventMapSourceLocation, root: string): EventMapSourceLocation {
    const relativeFile = relative(root, location.sourceFile).split(sep).join('/');
    return {
      ...location,
      sourceFile: relativeFile.startsWith('.') ? relativeFile : `./${relativeFile}`,
    };
  }

  /**
   * Keeps generated locations stable across filesystem discovery order and overlapping roots.
   * Source path, event offset, class name, and class offset form a deterministic tie-break.
   * @param locations Locations collected for one publication or listener category.
   * @returns A new sorted array without mutating scanner-owned arrays.
   */
  private static sortLocations(locations: EventMapSourceLocation[]): EventMapSourceLocation[] {
    return [...locations].sort((left, right) =>
      left.sourceFile.localeCompare(right.sourceFile)
      || left.offset - right.offset
      || (left.className ?? '').localeCompare(right.className ?? '')
      || (left.classOffset ?? -1) - (right.classOffset ?? -1));
  }
}
