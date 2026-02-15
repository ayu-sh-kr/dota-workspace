import {AfterInit, Component, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";

@Route({path: '/blogs/content'})
@Component({
  selector: "blog-content",
  shadow: false
})
export class BlogContentPage extends DotaPageElement {

  @Param('blog')
  blog!: string;

  @Param('category')
  category!: string;

  constructor() {
    super();
  }

  get seo(): SEO {
    const blogTitle = this.blog && this.category ?
      this.blog.replaceAll("-", " ")
        .replace(".md", "") + ` | ${this.category}` :
      'Blog Content';

    return {
      title: `${blogTitle}`,
      description: `Read the full content of our blog about ${blogTitle}.`,
      keywords: ['Dota', 'Blog Content', 'Development', 'Tools', 'Web Development', 'Programming', 'Software Development'],
      og: {
        title: `${blogTitle} - Dota`,
        description: `Read the full content of our blog about ${blogTitle}.`
      }
    }
  }

  @AfterInit()
  afterViewInit() {
    this.updateSEO()
  }

  render() {
    // language=html
    return `
      <app-header></app-header>
      <page-wrapper>
        <blog-view></blog-view>
      </page-wrapper>
      <app-footer></app-footer>
    `
  }
}