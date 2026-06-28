import {AfterInit, Component, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {type ColorName, type ThemeName} from "@ayu-sh-kr/dota-md";
import {Route} from "@ayu-sh-kr/dota-wrap/router";

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

  @Param('theme')
  theme: ThemeName = 'apple';

  @Param('color')
  color: ColorName = 'lime';

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
        <blog-view theme="${this.theme}" color="${this.color}" max-width="max-w-5xl"></blog-view>
      </page-wrapper>
      <app-footer></app-footer>
    `
  }
}
