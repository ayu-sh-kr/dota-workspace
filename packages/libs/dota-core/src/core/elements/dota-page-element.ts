import { BaseElement } from "@dota/core/elements";
import {type SEO} from "@dota/core/types";

/**
 * Synchronizes framework-managed page metadata with the current document head.
 * A missing optional value removes its existing tag so a previous route cannot leak
 * metadata into the next page.
 * @param seo Complete metadata to expose for the active page or route.
 */
export function updateDocumentSEO(seo: SEO): void {
  document.title = seo.title;
  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'keywords', normalizeKeywords(seo.keywords));
  upsertMeta('name', 'robots', seo.robots);
  upsertLink('icon', seo.favicon ?? seo.image);
  upsertLink('canonical', seo.canonical);

  upsertMeta('property', 'og:title', seo.og?.title);
  upsertMeta('property', 'og:description', seo.og?.description);
  upsertMeta('property', 'og:image', seo.og?.image);
  upsertMeta('property', 'og:type', seo.og?.type);
  upsertMeta('property', 'og:url', seo.og?.url);
  upsertMeta('property', 'og:site_name', seo.og?.siteName);

  upsertMeta('name', 'twitter:card', seo.twitter?.card);
  upsertMeta('name', 'twitter:title', seo.twitter?.title);
  upsertMeta('name', 'twitter:description', seo.twitter?.description);
  upsertMeta('name', 'twitter:image', seo.twitter?.image);
  upsertMeta('name', 'twitter:site', seo.twitter?.site);
  upsertMeta('name', 'twitter:creator', seo.twitter?.creator);
}

/**
 * Converts supported keyword input into the content value accepted by a meta tag.
 * Array entries are trimmed and empty values are discarded so pages cannot emit
 * blank comma-separated terms.
 * @param keywords Search terms supplied by a page or route.
 * @returns A normalized comma-separated value, or `undefined` when no term remains.
 */
function normalizeKeywords(keywords: SEO['keywords']): string | undefined {
  if (Array.isArray(keywords)) return keywords.filter(Boolean).map(keyword => keyword.trim()).filter(Boolean).join(', ');
  return typeof keywords === 'string' ? keywords.trim() : undefined;
}

/**
 * Keeps one framework-managed meta tag aligned with an optional SEO value.
 * Removing an omitted value is necessary because routes share one document head.
 * @param attr Attribute namespace used to identify the tag.
 * @param key Metadata name or Open Graph property to update.
 * @param value Content to write; an empty value removes the matching tag.
 */
function upsertMeta(attr: 'name' | 'property', key: string, value: string | undefined): void {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!value) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement('meta');
  element.setAttribute(attr, key);
  element.content = value;
  if (!existing) document.head.appendChild(element);
}

/**
 * Keeps one framework-managed link element aligned with an optional SEO URL.
 * Removing an omitted URL prevents a favicon or canonical link from a prior route
 * from remaining active.
 * @param rel Link relationship that identifies the managed element.
 * @param href URL to write; an empty value removes the matching link.
 */
function upsertLink(rel: string, href: string | undefined): void {
  const existing = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!href) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement('link');
  element.rel = rel;
  element.href = href;
  if (!existing) document.head.appendChild(element);
}

export abstract class DotaPageElement extends BaseElement {

  /**
   * Abstract getter that must be implemented by subclasses to provide SEO metadata for the page.
   * This includes essential information such as page title, description, keywords, and Open Graph data.
   * The returned SEO object is used by updateSEO() to populate document head with appropriate meta tags.
   *
   * @returns {SEO} An object containing title, description, search metadata, canonical URLs, and optional social-card data.
   * @example
   * get seo(): SEO {
   *   return { title: 'Home Page', description: 'Welcome to our site', keywords: ['home', 'welcome'] }
   * }
   */
  abstract get seo(): SEO;

  protected constructor() {
    super();
  }

  /**
   * Lifecycle hook that executes before the element is initialized.
   * Automatically updates the document's SEO metadata by calling updateSEO() to ensure
   * proper search engine optimization and social media sharing metadata are set before rendering.
   * This guarantees that crawlers and bots see the correct page information immediately.
   *
   * Delegates to the parent class after SEO updates are complete to maintain the initialization chain.
   */
  handleBeforeInit() {
    this.updateSEO()
    super.handleBeforeInit();
  }

  /**
   * Updates the document head with SEO metadata from the seo getter.
   * Sets the page title, standard SEO tags, canonical and favicon links, and Open Graph/Twitter card tags.
   * Keywords can be provided as an array or string and are automatically formatted as comma-separated values.
   *
   * This method handles conditional updates - only adds tags when values are present and removes them when empty.
   * Social metadata enhances how the page appears when shared on compatible platforms.
   * Called automatically during handleBeforeInit() but can be invoked manually to refresh SEO data dynamically.
   */
  updateSEO() {
    updateDocumentSEO(this.seo);
  }

}
