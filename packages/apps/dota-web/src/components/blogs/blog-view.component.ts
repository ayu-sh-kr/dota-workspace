import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import type {ColorKey, ThemeName} from "@ayu-sh-kr/dota-md";
import {MDService} from "@dota/configs/markdown.config.ts";
import {SITE_MARKDOWN_COLOR, SITE_MARKDOWN_THEME} from "@dota/configs/markdown-theme.config.ts";
import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {resolveBlogRouteParams} from "@dota/utils/blog-route.utils.ts";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "blog-view",
  shadow: false
})
export class BlogViewComponent extends BaseElement {

  docLoader!: DocLoaderService;

  @Property({name: 'current-blog', type: String})
  currentBlog: string = '';

  /** Theme passed through to <md-view>. Default: the site theme. */
  @Property({name: 'theme', type: String})
  theme: ThemeName = SITE_MARKDOWN_THEME;

  /** Color passed through to <md-view>. Default: the site accent. */
  @Property({name: 'color', type: String})
  color: ColorKey = SITE_MARKDOWN_COLOR;

  /** max-width of the article column. Default: 'max-w-3xl'. */
  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-3xl';

  constructor() {
    super();
    this.docLoader = new DocLoaderService();
  }

  /** Loads the route's Markdown document and renders it after the component connects. */
  @OnEvent('connected', true)
  async afterViewInit() {
    if (this.querySelector('[data-md-content]')?.textContent?.trim()) return;

    const {blog, category} = resolveBlogRouteParams(window.location.pathname, window.location.search);
    if (blog && category) {
      this.currentBlog = blog.trim();
      this.updateHTML();
      const raw = await this.docLoader.loadBlog(`${category.toLowerCase()}/${blog}`);
      MDService.render(raw, { publish: true })
    }
  }

  render(): TemplateResult {
    const blog = this.currentBlog || resolveBlogRouteParams(window.location.pathname, window.location.search).blog || '';
    const blogLabel = (blog || 'Blog')
      .replace(/\.md$/i, '')
      .replace(/-/g, ' ');
    const breadcrumbPath = JSON.stringify([
      {id: 'home', label: 'Home', href: '/'},
      {id: 'blogs', label: 'Blogs', href: '/blogs'},
      {id: 'current-blog', label: blogLabel},
    ]);

    return html`
      <section class="layout-page layout-section-page">
        <dota-breadcrumb
          path='${breadcrumbPath}'
          label="Blog breadcrumb"
          class="mb-8 block">
        </dota-breadcrumb>
        <div class="flex w-full flex-col xl:flex-row xl:items-start xl:justify-between xl:gap-8">
          <div class="min-w-0 flex-1 ${this.maxWidth}" style="overflow-anchor: none;">
            <md-view theme="${this.theme}" color="${this.color}"></md-view>
            <blog-suggestion current-blog="${blog}" limit="3"></blog-suggestion>
          </div>
          <aside class="hidden xl:block shrink-0 self-start sticky top-[var(--layout-sticky-top)]">
            <md-toc
              theme="${this.theme}"
              color="${this.color}"
              header-height="96"
              mode="sticky">
            </md-toc>
          </aside>
        </div>
      </section>
    `;
  }
}
