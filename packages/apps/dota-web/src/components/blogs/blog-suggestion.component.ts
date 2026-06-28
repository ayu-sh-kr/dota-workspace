import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
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

  render(): string {
    const currentBlog = this.currentBlog?.trim() ?? "";
    const suggestions = getSuggestedBlogPosts(currentBlog, Number(this.limit) || 3);

    if (!suggestions.length) {
      return "";
    }

    return `
      <section class="font-dm mt-14 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 sm:p-6">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Continue reading
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              Next blogs to open
            </h2>
          </div>
          <p class="max-w-sm text-sm text-slate-600 dark:text-slate-400">
            A quick path to the next few posts in this series.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          ${suggestions.map(post => `
            <blog-preview
              date="${post.date}"
              writer="${post.writer}"
              header="${post.header}"
              description="${post.description}"
              category="${post.category}"
              path="${post.path}">
            </blog-preview>
          `).join("")}
        </div>
      </section>
    `;
  }
}
