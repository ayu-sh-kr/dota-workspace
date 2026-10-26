import {Component, DotaPageElement, Param, SEO} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {type ColorKey, type ThemeName} from "@ayu-sh-kr/dota-md";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import { GeneralUtils } from "@dota/utils/GeneralUtils.ts";
import {resolveBlogRouteParams} from "@dota/utils/blog-route.utils.ts";
import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {SITE_MARKDOWN_COLOR, SITE_MARKDOWN_THEME} from "@dota/configs/markdown-theme.config.ts";

@Route({path: '/blogs/content/:category/:blog'})
@Component({
  selector: "blog-content",
  shadow: false
})
export class BlogContentPage extends DotaPageElement {

  @Param('theme')
  theme: ThemeName = SITE_MARKDOWN_THEME;

  @Param('color')
  color: ColorKey = SITE_MARKDOWN_COLOR;

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
      favicon: '/favicon.svg',
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

  render(): TemplateResult {
    return html`
      <app-header></app-header>
      <main>
        <blog-view theme="${this.theme}" color="${this.color}"></blog-view>
      </main>
      <app-footer></app-footer>
    `
  }
}
