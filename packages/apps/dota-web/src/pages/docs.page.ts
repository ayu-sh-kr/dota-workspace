import {Component, DotaPageElement, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {findDoc} from "@dota/configs/docs.config.ts";

/**
 * Shared shell of the documentation routes: resolves the page from the pathname and hands
 * its slug to `<docs-view>`. Undecorated so each route registers its own metadata.
 */
abstract class DocsRoutePage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    const title = `${findDoc(window.location.pathname)?.title ?? 'Not found'} | Dota Docs`;
    const description = 'Guides and reference for building web components with Dota.';
    return {title, description, favicon: '/favicon.svg', keywords: ['Dota', 'Web Components', 'Documentation'], og: {title, description}};
  }

  render(): TemplateResult {
    return html`<docs-view slug="${findDoc(window.location.pathname)?.slug ?? ''}"></docs-view>`;
  }
}

/** Documentation page at `/docs/<slug>`; the server renders each requested document. */
@Route({path: '/docs/:slug', mode: 'ssr'})
@Component({
  selector: 'docs-page',
  shadow: false
})
export class DocsPage extends DocsRoutePage {}

/** `/docs` entry point; renders the first documentation page. */
@Route({path: '/docs', mode: 'ssr'})
@Component({
  selector: 'docs-index-page',
  shadow: false
})
export class DocsIndexPage extends DocsRoutePage {}
