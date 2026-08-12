import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {MDService, type ColorName, type ThemeName} from "@ayu-sh-kr/dota-md";
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

  /** Theme passed through to <md-view>. Default: 'apple'. */
  @Property({name: 'theme', type: String})
  theme: ThemeName = 'apple';

  /** Color passed through to <md-view>. Default: 'lime'. */
  @Property({name: 'color', type: String})
  color: ColorName = 'lime';

  /** max-width passed through to <md-view>. Default: 'max-w-3xl'. */
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
    const routeBlog = resolveBlogRouteParams(window.location.pathname, window.location.search).blog;
    const blogLabel = (this.currentBlog || routeBlog || 'Blog')
      .replace(/\.md$/i, '')
      .replace(/-/g, ' ');
    const breadcrumbPath = JSON.stringify([
      {id: 'home', label: 'Home', href: '/'},
      {id: 'blogs', label: 'Blogs', href: '/blogs'},
      {id: 'current-blog', label: blogLabel},
    ]);

    // language=html
    return html`
      <section class="mx-auto w-full max-w-screen-2xl px-3 py-12 sm:px-5 lg:px-8">
        <dota-breadcrumb
          path='${breadcrumbPath}'
          label="Blog breadcrumb"
          class="mb-8 block">
        </dota-breadcrumb>
        <div class="flex w-full flex-col xl:flex-row xl:items-start xl:gap-8">
          <div class="min-w-0 flex-1 ${this.maxWidth}" style="overflow-anchor: none;">
            <md-view theme="${this.theme}" color="${this.color}"></md-view>
            <blog-suggestion current-blog="${this.currentBlog}" limit="3"></blog-suggestion>
          </div>
          <aside class="hidden xl:block shrink-0 self-start sticky top-16">
            <md-toc
              theme="${this.theme}"
              color="${this.color}"
              header-height="64"
              mode="sticky">
            </md-toc>
          </aside>
        </div>
      </section>
    `;
  }
}
