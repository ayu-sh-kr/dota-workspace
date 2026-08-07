import {Component, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {type ColorName, type ThemeName} from "@ayu-sh-kr/dota-md";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import { GeneralUtils } from "@dota/utils/GeneralUtils.ts";
import {resolveBlogRouteParams} from "@dota/utils/blog-route.utils.ts";
import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";

@Route({path: '/blogs/content/:category/:blog'})
@Component({
  selector: "blog-content",
  shadow: false
})
export class BlogContentPage extends DotaPageElement {

  @Param('theme')
  theme: ThemeName = 'apple';

  @Param('color')
  color: ColorName = 'lime';

  constructor() {
    super();
  }

  /** Builds SEO metadata from the path or legacy query parameters for this article. */
  get seo(): SEO {
    const {blog, category} = resolveBlogRouteParams(window.location.pathname, window.location.search);
    const blogTitle = blog && category ?
      blog.replaceAll("-", " ")
        .replace(".md", "") + ` | ${category}` :
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

  @OnEvent('connected', true)
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
    this.updateSEO();
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
