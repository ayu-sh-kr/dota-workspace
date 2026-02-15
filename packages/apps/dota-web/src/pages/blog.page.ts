import {Component, AfterInit, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";


@Route({path: '/blogs'})
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

  render(): string {
    // language=html
    return `
      <app-header></app-header>
      <page-wrapper>
        <blog-section></blog-section>
      </page-wrapper>
      <app-footer></app-footer>
    `
  }

}