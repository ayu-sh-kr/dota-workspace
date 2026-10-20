import {Component, AfterInit, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {Route} from "@ayu-sh-kr/dota-wrap/router";


@Route({path: '/blogs', mode: 'ssg'})
@Component({
  selector: 'blog-page',
  shadow: false
})
export class BlogPage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      favicon: '/favicon.svg',
      title: 'Blogs - Dota',
      description: 'Read our latest blogs about Dota, the ultimate tool for developers.',
      keywords: ['Dota', 'Blogs', 'Development', 'Tools', 'Web Development', 'Programming', 'Software Development'],
      og: {
        title: 'Blogs - Dota',
        description: 'Read our latest blogs about Dota, the ultimate tool for developers.'
      }
    }
  }

  @AfterInit()
  afterViewInit() {
    window.scrollTo({top: 0, behavior: 'instant'});
  }

  render(): TemplateResult {
    return html`
      <app-header></app-header>
      <main>
        <blog-section></blog-section>
      </main>
      <app-footer></app-footer>
    `
  }

}
