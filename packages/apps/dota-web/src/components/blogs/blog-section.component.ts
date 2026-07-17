// blog-section.component.ts
import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {blogPosts} from "@dota/configs/blogs.config.ts";
import {
  BLOG_PAGINATION_CHANGE_EVENT,
  readBlogPaginationState,
} from "@dota/components/blogs/blog-pagination.component.ts";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";

@Component({
  selector: 'blog-section',
  shadow: false,
})
export class BlogSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  @OnEvent(BLOG_PAGINATION_CHANGE_EVENT)
  handlePaginationChange() {
    // Storage is the source of truth, so every render reads the latest persisted state.
    this.updateHTML();
  }

  render(): string {
    const latestFirstPosts = [...blogPosts].sort((left, right) => right.date.localeCompare(left.date));
    const paginationState = readBlogPaginationState(latestFirstPosts.length);
    const startIndex = (paginationState.currentPage - 1) * paginationState.pageSize;
    const visiblePosts = latestFirstPosts.slice(startIndex, startIndex + paginationState.pageSize);

    // language=html
    return `
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
          <section-header>
            Blogs by the <span class="text-purple-600 dark:text-purple-500">Team Dota</span>
          </section-header>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            ${visiblePosts.map(post => `
              <blog-preview
                date="${post.date}"
                writer="${post.writer}"
                header="${post.header}"
                description="${post.description}"
                category="${post.category}"
                path="${post.path}"
              ></blog-preview>
            `).join('')}
          </div>
          <blog-pagination total="${latestFirstPosts.length}"></blog-pagination>
        </div>
      </section>
    `;
  }
}
