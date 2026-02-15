import {AfterInit, BaseElement, Component, DotaPageElement, HTML, SEO} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";


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
      description: 'Explore the comprehensive documentation for Dota Web, your go-to resource for understanding and utilizing the powerful features of our web application built on the Dota framework.',
      keywords: ['Dota Web Documentation', 'Dota Framework Guide', 'Web Application Docs', 'Dota Web Features', 'Dota Web API'],
      og: {
        title: 'Dota Web Documentation - Your Guide to Mastering Dota Web',
        description: 'Dive into the detailed documentation for Dota Web, your essential guide to mastering the features and capabilities of our cutting-edge web application built on the Dota framework.',
      }
    }
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant')
  }

  render(): string {
    // language=html
    return HTML`
      <app-header></app-header>
      <doc-section></doc-section>
      <app-footer></app-footer>
      <scroll-bottom-button></scroll-bottom-button>
    `;
  }
}
