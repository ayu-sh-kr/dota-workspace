import { BaseElement } from "@dota/core/elements";
import {type SEO} from "@dota/core/types";
import {SEO_JSON_LD_ATTRIBUTE, seoHeadTags, seoHeadTagSelector, type SeoHeadTag} from "@dota/core/elements/document-head.ts";

export {SEO_JSON_LD_ATTRIBUTE, seoHeadTags, seoHeadTagSelector, type SeoHeadTag} from "@dota/core/elements/document-head.ts";

/**
 * Synchronizes framework-managed page metadata with the current document head.
 * Every tag in {@link seoHeadTags} is applied, so a value the page omits removes the
 * previous page's tag instead of leaking it into the next route.
 * @param seo Complete metadata to expose for the active page or route.
 */
export function updateDocumentSEO(seo: SEO): void {
  seoHeadTags(seo).forEach(applyHeadTag);
}

/**
 * Creates, updates, or removes the one head element a managed tag describes.
 * The element is found by {@link seoHeadTagSelector}, so repeated updates reuse it; an
 * empty value removes it. JSON-LD is written with `textContent` so it is never parsed as HTML.
 * @param tag Managed head element and its value for the current page.
 */
function applyHeadTag(tag: SeoHeadTag): void {
  if (tag.kind === "title") {
    document.title = tag.text;
    return;
  }
  const existing = document.head.querySelector(seoHeadTagSelector(tag));
  const value = tag.kind === "meta" ? tag.content : tag.kind === "link" ? tag.href : tag.data;
  if (!value) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement(tag.kind === "json-ld" ? "script" : tag.kind);
  switch (tag.kind) {
    case "meta":
      element.setAttribute(tag.attribute, tag.key);
      element.setAttribute("content", tag.content!);
      break;
    case "link":
      element.setAttribute("rel", tag.rel);
      element.setAttribute("href", tag.href!);
      break;
    case "json-ld":
      element.setAttribute("type", "application/ld+json");
      element.setAttribute(SEO_JSON_LD_ATTRIBUTE, "");
      element.textContent = JSON.stringify(tag.data);
      break;
  }
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
