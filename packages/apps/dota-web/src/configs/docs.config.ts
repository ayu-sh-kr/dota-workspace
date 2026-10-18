/** One documentation page, loaded from a public Markdown file or a custom source. */
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
  {slug: 'ssg-ssr-csr', title: 'Start here', section: 'Server Rendering'},
  {slug: 'ssr-html-first', title: '1. From URL to HTML', section: 'Server Rendering'},
  {slug: 'ssr-component', title: '2. A server-ready component', section: 'Server Rendering'},
  {slug: 'ssr-request', title: '3. Inside one SSR request', section: 'Server Rendering'},
  {slug: 'ssr-templates', title: '4. Templates become HTML', section: 'Server Rendering'},
  {slug: 'ssr-static-build', title: '5. SSG: render at build time', section: 'Server Rendering'},
  {slug: 'ssr-hydration', title: '6. Make HTML interactive', section: 'Server Rendering'},
  {slug: 'ssr-hosting', title: '7. Build and serve a mixed app', section: 'Server Rendering'},
  {slug: 'ssr-package-map', title: '8. Packages and server limits', section: 'Server Rendering'},
  {slug: 'ssr-file-reference', title: 'Reference: every changed file', section: 'Server Rendering'},
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
