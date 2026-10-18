/** Persisted, sanitized icon shared across browser sessions. */
interface CachedIcon {
  svg: string;
  expiresAt: number;
}

const TTL = 7 * 24 * 60 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;
const PREFIX = 'dota:icons:v1:';
const memory = new Map<string, CachedIcon>();
const pending = new Map<string, Promise<string | null>>();
const retryAfter = new Map<string, number>();

/**
 * Removes executable and externally-loading content before SVG enters light DOM.
 * Cached values are sanitized again because browser storage can be modified.
 * @param markup SVG received from the network or persistent cache.
 * @returns Presentational SVG markup, or null for malformed responses.
 */
export function sanitizeIcon(markup: string): string | null {
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = document.documentElement;
  if (svg.localName !== 'svg' || document.querySelector('parsererror')) return null;
  svg.querySelectorAll('script, style, foreignObject, iframe, object, embed, audio, video').forEach(element => element.remove());
  [svg, ...svg.querySelectorAll('*')].forEach(element => {
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || (name === 'href' || name === 'xlink:href') && !value.startsWith('#')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  svg.removeAttribute('style');
  svg.removeAttribute('class');
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Loads an icon through memory, persistent browser storage, then its source URL.
 * Seven-day entries survive hard refreshes; failures retain stale SVGs and wait
 * before retrying. Storage failures never prevent rendering. Concurrent calls share work.
 * @param url Same-origin asset URL or the default Iconify URL.
 * @returns Sanitized SVG, or null when no usable cached or network value exists.
 */
export function loadCachedIcon(url: string): Promise<string | null> {
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;
  const promise = loadIcon(url).finally(() => pending.delete(url));
  pending.set(url, promise);
  return promise;
}

/**
 * Applies TTL and failure cooldown without turning persistence into a prerequisite.
 * @param url Cache identity and fetch destination.
 * @returns A fresh icon or the last usable stale entry when fetching fails.
 */
async function loadIcon(url: string): Promise<string | null> {
  const key = PREFIX + url;
  const retryKey = `${key}:retry-after`;
  let cached = memory.get(url);
  if (!cached) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) ?? 'null') as CachedIcon | null;
      if (stored && typeof stored.svg === 'string' && Number.isFinite(stored.expiresAt)) {
        const svg = sanitizeIcon(stored.svg);
        if (svg) cached = {svg, expiresAt: stored.expiresAt};
      }
    } catch { /* Storage can be unavailable or contain malformed entries. */ }
    if (cached) memory.set(url, cached);
  }
  if (cached && cached.expiresAt > Date.now()) return cached.svg;
  let retryAt = retryAfter.get(url) ?? 0;
  try {
    const stored = Number(window.localStorage.getItem(retryKey));
    if (Number.isFinite(stored)) retryAt = Math.max(retryAt, stored);
  } catch { /* Cooldown still applies in memory when storage is unavailable. */ }
  if (retryAt > Date.now()) return cached?.svg ?? null;

  const deferRetry = (delay = RETRY_DELAY) => {
    const until = Date.now() + delay;
    retryAfter.set(url, until);
    try { window.localStorage.setItem(retryKey, JSON.stringify(until)); } catch { /* Memory remains usable. */ }
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const header = response.headers.get('retry-after');
      const delay = header && /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header ?? '') - Date.now();
      deferRetry(Math.max(RETRY_DELAY, Number.isFinite(delay) ? delay : 0));
      return cached?.svg ?? null;
    }
    const svg = sanitizeIcon(await response.text());
    if (!svg) {
      deferRetry();
      return cached?.svg ?? null;
    }
    const entry = {svg, expiresAt: Date.now() + TTL};
    memory.set(url, entry);
    retryAfter.delete(url);
    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
      window.localStorage.removeItem(retryKey);
    } catch { /* Keep the memory entry if storage is full. */ }
    return svg;
  } catch (error) {
    deferRetry();
    if (cached) return cached.svg;
    throw error;
  }
}
