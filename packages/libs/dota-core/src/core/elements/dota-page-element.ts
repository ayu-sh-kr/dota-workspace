import { BaseElement } from "@dota/core/elements";
import {type SEO} from "@dota/core/types";



export abstract class DotaPageElement extends BaseElement {

  /**
   * Abstract getter that must be implemented by subclasses to provide SEO metadata for the page.
   * This includes essential information such as page title, description, keywords, and Open Graph data.
   * The returned SEO object is used by updateSEO() to populate document head with appropriate meta tags.
   *
   * @returns {SEO} An object containing title, description, keywords, image, and optional Open Graph properties.
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
   * Sets the page title, meta description, favicon, keywords, and Open Graph tags for social media sharing.
   * Keywords can be provided as an array or string and are automatically formatted as comma-separated values.
   *
   * This method handles conditional updates - only adds tags when values are present and removes them when empty.
   * Open Graph metadata enhances how the page appears when shared on social platforms like Facebook and LinkedIn.
   * Called automatically during handleBeforeInit() but can be invoked manually to refresh SEO data dynamically.
   */
  updateSEO() {
    document.title = this.seo.title;
    this.upsertMeta('name', 'description', this.seo.description);

    if (this.seo.image) {
      this.upsertLink('icon', this.seo.image);
    }

    if (this.seo.keywords) {
      const keywordsValue = Array.isArray(this.seo.keywords)
        ? (this.seo.keywords as string[]).filter(Boolean).map(k => k.trim()).join(', ')
        : String(this.seo.keywords).trim();
      this.upsertMeta('name', 'keywords', keywordsValue);
    }

    if (this.seo.og) {
      this.upsertMeta('property', 'og:title', this.seo.og.title);
      this.upsertMeta('property', 'og:description', this.seo.og.description);

      if (this.seo.og.image) {
        this.upsertMeta('property', 'og:image', this.seo.og.image);
      }

    }
  }

  /**
   * Creates or updates a meta tag in the document head with the specified attribute, key, and value.
   * Removes the meta tag if value is empty or falsy, ensuring clean document head without stale metadata.
   * Uses either 'name' or 'property' attribute to identify the meta tag (property is used for Open Graph tags).
   *
   * If the meta tag doesn't exist, creates a new one and appends it to document.head.
   * If it exists, updates the 'content' attribute with the new value.
   *
   * @param attr - The attribute type to identify the meta tag ('name' for standard meta, 'property' for OG tags)
   * @param key - The identifier value for the attribute (e.g., 'description' or 'og:title')
   * @param value - The content value to set; removes tag if empty
   */
  private upsertMeta(attr: 'name' | 'property', key: string, value: string) {
    const selector = `meta[${attr}="${key}"]`;
    let el = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!value) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  /**
   * Creates or updates a link tag in the document head with the specified rel and href attributes.
   * Commonly used for setting favicons, stylesheets, or other linked resources in the page head.
   * Removes the link tag if href is empty or falsy to prevent broken references.
   *
   * If the link element doesn't exist, creates a new one and appends it to document.head.
   * If it exists, updates the href attribute with the new URL value.
   *
   * @param rel - The relationship attribute for the link (e.g., 'icon', 'stylesheet', 'canonical')
   * @param href - The URL to link to; removes tag if empty
   */
  private upsertLink(rel: string, href: string) {
    if (!href) {
      const existing = document.head.querySelector(`link[rel="${rel}"]`);
      existing?.remove();
      return;
    }
    let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
  }

}