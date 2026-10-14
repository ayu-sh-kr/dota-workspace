/** Markdown file shown when a docs URL names no document. */
export const DEFAULT_DOC_FILE = 'Getting-Started.md';

/**
 * Resolves the Markdown file selected by a docs URL.
 * Path-based URLs (`/docs/Getting-Started`) are prerendered by SSG; the legacy
 * `?content=Getting-Started.md` query keeps older links working.
 * @param pathname Current browser pathname.
 * @param search Current browser query string.
 * @returns Markdown filename including its `.md` suffix.
 */
export function resolveDocFile(pathname: string, search: string): string {
  const [section, name] = pathname.split('/').filter(Boolean);
  if (section === 'docs' && name) return `${decodeURIComponent(name).replace(/\.md$/i, '')}.md`;
  return new URLSearchParams(search).get('content') ?? DEFAULT_DOC_FILE;
}

/**
 * Builds the prerendered pathname for a docs Markdown file.
 * @param file Markdown filename such as `Getting-Started.md`.
 * @returns Pathname such as `/docs/Getting-Started`.
 */
export function docPath(file: string): string {
  return `/docs/${encodeURIComponent(file.replace(/\.md$/i, ''))}`;
}
