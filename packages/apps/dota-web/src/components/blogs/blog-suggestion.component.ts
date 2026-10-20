import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, nothing, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {getSuggestedBlogPosts} from "@dota/configs/blogs.config.ts";

@Component({
  selector: "blog-suggestion",
  shadow: false,
})
export class BlogSuggestionComponent extends BaseElement {
  @Property({
    name: "current-blog",
    type: String,
  })
  currentBlog: string = "";

  @Property({
    name: "limit",
    type: String,
  })
  limit: string = "3";

  render(): TemplateResult | typeof nothing {
    const currentBlog = this.currentBlog?.trim() ?? "";
    const suggestions = getSuggestedBlogPosts(currentBlog, Number(this.limit) || 3);

    if (!suggestions.length) {
      return nothing;
    }

    return html`
      <section class="mt-16 border-t border-default pt-10">
        <div class="mb-6 flex flex-col gap-2">
          <span class="type-eyebrow">Continue reading</span>
          <h2 class="type-section text-foreground">Next posts</h2>
        </div>

        <div class="layout-grid-3">
          ${suggestions.map(post => html`
            <blog-preview
              date="${post.date}"
              writer="${post.writer}"
              header="${post.header}"
              description="${post.description}"
              category="${post.category}"
              path="${post.path}">
            </blog-preview>
          `)}
        </div>
      </section>
    `;
  }
}
