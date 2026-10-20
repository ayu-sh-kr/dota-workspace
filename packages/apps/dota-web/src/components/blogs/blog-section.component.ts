// blog-section.component.ts
import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {blogPosts} from "@dota/configs/blogs.config.ts";
import {
  BLOG_PAGINATION_CHANGE_EVENT,
  type BlogPaginationState,
  DEFAULT_PAGINATION_STATE,
  readBlogPaginationState,
} from "@dota/components/blogs/blog-pagination.component.ts";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, keyed, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

/** Published posts, newest first. */
const LATEST_FIRST_POSTS = [...blogPosts].sort((left, right) => right.date.localeCompare(left.date));

@Component({
  selector: 'blog-section',
  shadow: false,
})
export class BlogSectionComponent extends BaseElement {

  /** Page shown by the list; starts at the default so prerendered and hydrated output agree. */
  private paginationState: BlogPaginationState = DEFAULT_PAGINATION_STATE;

  constructor() {
    super();
  }

  /** Applies the reader's stored page after hydration has adopted the default first page. */
  @OnEvent('connected', true)
  restorePagination() {
    this.paginationState = readBlogPaginationState(LATEST_FIRST_POSTS.length);
    this.updateHTML();
  }

  @OnEvent(BLOG_PAGINATION_CHANGE_EVENT)
  handlePaginationChange(event: ApplicationEvent<typeof BLOG_PAGINATION_CHANGE_EVENT>) {
    this.paginationState = event.data;
    this.updateHTML();
  }

  render(): TemplateResult {
    const {currentPage, pageSize} = this.paginationState;
    const startIndex = (currentPage - 1) * pageSize;
    const visiblePosts = LATEST_FIRST_POSTS.slice(startIndex, startIndex + pageSize);

    return html`
      <section class="relative isolate font-dm mx-auto max-w-7xl px-3 py-12 lg:pt-20">
        <orb-background orbit-count="7"
            orbit-spacing="10"
            orbit-speed="10"
            orbit-direction="clockwise"
            orbit-particle-size="0.8"
            orbit-particle-gap="11"
            orbit-size="lg"
        >
        </orb-background>

        <div class="relative z-10">
          <section-header heading="Blogs by the" highlight="Team Dota"></section-header>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            ${keyed(visiblePosts, post => `${post.category}/${post.path}`, post => html`
              <blog-preview
                date="${post.date}"
                writer="${post.writer}"
                header="${post.header}"
                description="${post.description}"
                category="${post.category}"
                path="${post.path}"
              ></blog-preview>
            `)}
          </div>
          <blog-pagination total="${LATEST_FIRST_POSTS.length}"></blog-pagination>
        </div>
      </section>
    `;
  }
}
