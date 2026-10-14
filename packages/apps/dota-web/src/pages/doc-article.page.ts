import {AfterInit, Component, DotaPageElement, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";
import {resolveDocFile} from "@dota/utils/doc-route.utils.ts";

/**
 * DocArticlePage
 *
 * One documentation file at a stable, prerendered path such as `/docs/Getting-Started`.
 * It renders the same `<doc-section>` shell as `/docs`; the section reads the file from
 * the path. SSG lists every file from `docFiles` in `vite.config.ts`.
 */
@Route({path: '/docs/:doc'})
@Component({
  selector: 'doc-article-page',
  shadow: false
})
export class DocArticlePage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    const title = resolveDocFile(window.location.pathname, window.location.search)
      .replace(/\.md$/i, '')
      .replace(/-/g, ' ');
    return {
      title: `${title} | Dota Web Documentation`,
      description: `${title} — Dota Web documentation.`,
      keywords: ['Dota Web Documentation', title, 'Web Components'],
      og: {
        title: `${title} | Dota Web Documentation`,
        description: `${title} — Dota Web documentation.`,
      }
    };
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render(): TemplateResult {
    return html`<doc-section></doc-section>`;
  }
}
