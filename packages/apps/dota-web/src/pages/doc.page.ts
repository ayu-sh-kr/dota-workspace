import {AfterInit, Component, DotaPageElement, HTML, SEO} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";


/**
 * DocPage
 *
 * Full-page shell for the documentation section.
 * The <doc-section> component owns everything:
 *   - its own sticky header (with breadcrumb + theme picker + dark toggle)
 *   - the sidebar / drawer navigation
 *   - the markdown content area
 *
 * <app-header> and <app-footer> are intentionally omitted here so the doc
 * layout can use the full viewport height without a floating nav bar on top.
 */
@Route({path: '/docs'})
@Component({
  selector: 'doc-page',
  shadow: false
})
export class DocPage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      title: 'Dota Web - Documentation',
      description: 'Explore the comprehensive documentation for Dota Web.',
      keywords: ['Dota Web Documentation', 'Dota Framework Guide', 'Web Application Docs'],
      og: {
        title: 'Dota Web Documentation',
        description: 'Dive into the detailed documentation for Dota Web.',
      }
    };
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render(): string {
    return HTML`
            <doc-section></doc-section>
        `;
  }
}
