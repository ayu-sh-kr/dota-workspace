import {randomUUID} from 'node:crypto';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

/** One upstream SVG and the time it must be refreshed on a subsequent build. */
interface DiskIcon {
  svg: string;
  expiresAt: number;
}

const TTL = 7 * 24 * 60 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;
export const ICON_NAME_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/;

/** Disk cache shared by dev requests and builds; survives cleared build output. */
export class DiskIconCache {
  private readonly pending = new Map<string, Promise<string | null>>();
  private readonly retryAfter = new Map<string, number>();
  private blockedUntil = 0;

  constructor(private readonly directory: string) {}

  /**
   * Coalesces reads/downloads and rejects names that could escape the cache directory.
   * @param name Iconify collection and icon identifier.
   * @returns Cached SVG, stale SVG on upstream failure, or null for a cold miss.
   */
  get(name: string): Promise<string | null> {
    if (!ICON_NAME_PATTERN.test(name)) return Promise.resolve(null);
    const existing = this.pending.get(name);
    if (existing) return existing;
    const result = this.load(name).finally(() => this.pending.delete(name));
    this.pending.set(name, result);
    return result;
  }

  /**
   * Refreshes expired files, preserving the last good SVG when offline or rate limited.
   * The upstream-wide cooldown is persisted so rebuilds do not immediately retry a 429.
   * @param name Validated icon name used for the filename and fixed upstream URL.
   * @returns A usable SVG when either disk or Iconify can supply one.
   */
  private async load(name: string): Promise<string | null> {
    const file = resolve(this.directory, `${name.replace(':', '--')}.json`);
    let cached: DiskIcon | undefined;
    try {
      const value = JSON.parse(await readFile(file, 'utf8')) as DiskIcon;
      if (typeof value.svg === 'string' && /^\s*<svg[\s>]/.test(value.svg) && Number.isFinite(value.expiresAt)) cached = value;
    } catch { /* Missing or corrupt entries are cache misses. */ }
    if (cached && cached.expiresAt > Date.now()) return cached.svg;

    const cooldownFile = resolve(this.directory, 'retry-after.json');
    let cooldown = Math.max(this.retryAfter.get(name) ?? 0, this.blockedUntil);
    try {
      const stored: unknown = JSON.parse(await readFile(cooldownFile, 'utf8'));
      if (typeof stored === 'number' && Number.isFinite(stored)) cooldown = Math.max(cooldown, stored);
    } catch { /* A missing cooldown allows a request. */ }
    if (cooldown > Date.now()) return cached?.svg ?? null;

    try {
      const response = await fetch(`https://api.iconify.design/${name}.svg`, {signal: AbortSignal.timeout(10_000)});
      if (!response.ok) {
        const header = response.headers.get('retry-after');
        const delay = header && /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header ?? '') - Date.now();
        const retryAt = Date.now() + Math.max(RETRY_DELAY, Number.isFinite(delay) ? delay : 0);
        this.retryAfter.set(name, retryAt);
        if (response.status === 429) {
          this.blockedUntil = retryAt;
          await this.persist(cooldownFile, retryAt);
        }
        return cached?.svg ?? null;
      }
      const svg = await response.text();
      if (!/^\s*<svg[\s>]/.test(svg) || !svg.trimEnd().endsWith('</svg>')) {
        this.retryAfter.set(name, Date.now() + RETRY_DELAY);
        return cached?.svg ?? null;
      }
      await this.persist(file, {svg, expiresAt: Date.now() + TTL});
      return svg;
    } catch {
      this.retryAfter.set(name, Date.now() + RETRY_DELAY);
      return cached?.svg ?? null;
    }
  }

  /**
   * Atomically replaces one cache file so parallel processes never read partial JSON.
   * @param file Validated cache destination under the configured directory.
   * @param value Serializable cache entry or cooldown timestamp.
   */
  private async persist(file: string, value: DiskIcon | number): Promise<void> {
    try {
      await mkdir(this.directory, {recursive: true});
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(value), 'utf8');
      await rename(temporary, file);
    } catch { /* Read-only disks still allow the freshly downloaded icon to render. */ }
  }
}
