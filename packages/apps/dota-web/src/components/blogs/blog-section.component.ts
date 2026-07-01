// blog-section.component.ts
import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {blogPosts} from "@dota/configs/blogs.config.ts";

@Component({
  selector: 'blog-section',
  shadow: false,
})
export class BlogSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    // language=html
    return `
      <section class="relative isolate font-dm mx-auto max-w-7xl px-3 py-12 lg:pt-20">
        <orb-background orbit-count="7" 
            orbit-spacing="10"
            orbit-speed="10"
            orbit-direction="clockwise"
            orbit-particle-size="0.8"
            orbit-particle-gap="11"
        >
        </orb-background>

        <div class="relative z-10">
          <section-header>
            Blogs by the <span class="text-purple-600 dark:text-purple-500">Team Dota</span>
          </section-header>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            ${blogPosts.map(post => `
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
        </div>
      </section>
    `;
  }
}
