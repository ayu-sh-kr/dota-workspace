/** One documentation page, served at `/docs/<slug>` from `public/docs/<slug>.md`. */
export interface DocEntry {
  /** URL segment and Markdown file name. */
  slug: string;
  /** Title shown in navigation, the page title, and prev/next links. */
  title: string;
  /** Navigation group the page belongs to. */
  section: string;
}

/** Every documentation page in reading order; navigation, prev/next, and SSG routes derive from it. */
export const DOCS: readonly DocEntry[] = [
  {slug: 'getting-started', title: 'Getting Started', section: 'Introduction'},
  {slug: 'guides', title: 'Guides', section: 'Introduction'},
  {slug: 'component-registration', title: 'Component Registration', section: 'Guide'},
  {slug: 'component-definition', title: 'Component Definition', section: 'Guide'},
  {slug: 'property-binding', title: 'Property Binding', section: 'Guide'},
  {slug: 'event-binding', title: 'Event Binding', section: 'Guide'},
  {slug: 'event-emitter', title: 'Event Emitter', section: 'Guide'},
  {slug: 'reactivity', title: 'Reactivity', section: 'Guide'},
  {slug: 'core', title: 'Core', section: 'Concepts'},
  {slug: 'decorators', title: 'Decorators', section: 'Concepts'},
  {slug: 'life-cycle', title: 'Life Cycle', section: 'Concepts'},
  {slug: 'rest-client', title: 'Rest Client', section: 'Tools'},
  {slug: 'router', title: 'Router', section: 'Tools'},
];

/** Pathname of a documentation page. */
export const docUrl = (slug: string): string => `/docs/${slug}`;

/**
 * Resolves the page for a docs pathname; `/docs` opens the first page.
 * @returns The matching entry, or `undefined` for an unknown slug.
 */
export function findDoc(pathname: string): DocEntry | undefined {
  const slug = pathname.split('/').filter(Boolean)[1];
  return slug ? DOCS.find(doc => doc.slug === slug) : DOCS[0];
}
