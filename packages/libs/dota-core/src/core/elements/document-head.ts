import type {SEO} from "@dota/core/types";

/**
 * Marks the one `<script type="application/ld+json">` the framework manages for `SEO.jsonLd`.
 * Server renderers write the same attribute, so the browser updates the server's script on
 * navigation instead of adding a second one, and author-written JSON-LD scripts are never touched.
 */
export const SEO_JSON_LD_ATTRIBUTE = "data-dota-seo";

/**
 * One head element the framework manages for page SEO.
 * It is the single contract between page metadata and the document head: the browser's
 * `updateDocumentSEO` applies these, and server renderers serialize the same list, so the
 * two cannot drift. Each variant names the element and how it is identified; a value of
 * `undefined` means the element must be absent, which removes a previous page's tag.
 */
export type SeoHeadTag =
  | {
      /** The document `<title>`. */
      readonly kind: "title";
      /** Title text; always present, because every page has a title. */
      readonly text: string;
    }
  | {
      /** A `<meta>` tag identified by `name` or `property`. */
      readonly kind: "meta";
      /** Identifying attribute: `name` for standard and Twitter tags, `property` for Open Graph. */
      readonly attribute: "name" | "property";
      /** Value of the identifying attribute, such as `description` or `og:title`. */
      readonly key: string;
      /** Tag content; `undefined` or empty removes the tag. */
      readonly content: string | undefined;
    }
  | {
      /** A `<link>` tag identified by `rel`. */
      readonly kind: "link";
      /** Link relationship, such as `icon` or `canonical`. */
      readonly rel: string;
      /** Link target; `undefined` or empty removes the tag. */
      readonly href: string | undefined;
    }
  | {
      /** The managed JSON-LD script, marked with {@link SEO_JSON_LD_ATTRIBUTE}. */
      readonly kind: "json-ld";
      /** Structured data to serialize as JSON; `undefined` removes the script. */
      readonly data: SEO["jsonLd"];
    };

/**
 * Lists every head element the framework manages for a page, in the order they are written.
 * The list always has the same entries, whatever the page provides: absent values come back
 * as `undefined` so consumers know which existing tags to remove, not just which to add.
 * @param seo Page or route metadata.
 * @returns Managed head elements, title first and JSON-LD last.
 */
export function seoHeadTags(seo: SEO): readonly SeoHeadTag[] {
  const meta = (attribute: "name" | "property", key: string, content: string | undefined): SeoHeadTag => ({kind: "meta", attribute, key, content});
  const link = (rel: string, href: string | undefined): SeoHeadTag => ({kind: "link", rel, href});
  return [
    {kind: "title", text: seo.title},
    meta("name", "description", seo.description),
    meta("name", "keywords", normalizeKeywords(seo.keywords)),
    meta("name", "robots", seo.robots),
    link("icon", seo.favicon ?? seo.image),
    link("canonical", seo.canonical),
    meta("property", "og:title", seo.og?.title),
    meta("property", "og:description", seo.og?.description),
    meta("property", "og:image", seo.og?.image),
    meta("property", "og:type", seo.og?.type),
    meta("property", "og:url", seo.og?.url),
    meta("property", "og:site_name", seo.og?.siteName),
    meta("name", "twitter:card", seo.twitter?.card),
    meta("name", "twitter:title", seo.twitter?.title),
    meta("name", "twitter:description", seo.twitter?.description),
    meta("name", "twitter:image", seo.twitter?.image),
    meta("name", "twitter:site", seo.twitter?.site),
    meta("name", "twitter:creator", seo.twitter?.creator),
    {kind: "json-ld", data: seo.jsonLd}
  ];
}

/**
 * CSS selector that finds the element a head tag manages, so it can be updated in place or removed.
 * Server renderers use the same identity to drop a document shell's default copy of each tag.
 * @param tag Managed head element.
 */
export function seoHeadTagSelector(tag: SeoHeadTag): string {
  switch (tag.kind) {
    case "title":
      return "title";
    case "meta":
      return `meta[${tag.attribute}="${tag.key}"]`;
    case "link":
      return `link[rel="${tag.rel}"]`;
    case "json-ld":
      return `script[type="application/ld+json"][${SEO_JSON_LD_ATTRIBUTE}]`;
  }
}

/**
 * Formats keywords for the keywords meta tag: array entries are trimmed, blanks dropped,
 * and the rest joined with commas, so pages cannot emit empty terms.
 * @param keywords Search terms supplied by a page or route.
 * @returns The tag content, or `undefined` when no term remains.
 */
function normalizeKeywords(keywords: SEO["keywords"]): string | undefined {
  if (typeof keywords === "string") return keywords.trim() || undefined;
  return keywords?.map((keyword) => keyword.trim()).filter(Boolean).join(", ") || undefined;
}
