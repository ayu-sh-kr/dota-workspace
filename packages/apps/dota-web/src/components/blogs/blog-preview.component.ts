import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {type BlogCategory} from "@dota/configs/blogs.config.ts";

/** Categories with their own label; anything else is filed under "Others". */
const KNOWN_CATEGORIES = new Set<BlogCategory>(["Rant", "Tutorial", "News", "Tools", "Others"]);

let revealObserver: IntersectionObserver | undefined;

const estimateReadTime = (header: string, description: string): number => {
  const wordCount = `${header} ${description}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

@Component({
  selector: "blog-preview",
  shadow: false,
})
export class BlogPreviewComponent extends BaseElement {

  @Property({name: "date", type: String})
  date: string = "";

  @Property({name: "writer", type: String})
  writer: string = "";

  @Property({name: "header", type: String})
  header: string = "";

  @Property({name: "description", type: String})
  description: string = "";

  @Property({name: "category", type: String})
  category: BlogCategory = "Rant";

  @Property({name: "path", type: String})
  path: string = "";

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    const card = this.querySelector<HTMLElement>("[data-blog-card]");
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      card?.classList.add("is-visible");
      return;
    }

    const siblingCards = this.parentElement?.querySelectorAll("blog-preview") ?? [];
    const index = Array.from(siblingCards).indexOf(this);
    card.style.setProperty("--blog-preview-delay", `${Math.max(0, index) * 60}ms`);

    if (!("IntersectionObserver" in window)) {
      card.classList.add("is-visible");
      return;
    }

    revealObserver ??= new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }

        const target = entry.target as HTMLElement;
        target.classList.add("is-visible");
        observer.unobserve(target);
      });
    }, {threshold: 0.12, rootMargin: "0px 0px -24px"});

    revealObserver.observe(card);
  }

  /**
   * Prerendered article URL. The card links to it with a plain anchor so the browser loads the
   * static page instead of rendering the article on the client and fetching its Markdown again.
   */
  private get blogUrl(): string {
    return `/blogs/content/${encodeURIComponent(this.category)}/${encodeURIComponent(this.path)}`;
  }

  render(): TemplateResult {
    const category = KNOWN_CATEGORIES.has(this.category) ? this.category : "Others";
    const readTime = estimateReadTime(this.header, this.description);

    return html`
      <style>
        .blog-preview-card {
          transform: translateY(1.25rem);
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), border-color var(--motion-fast);
          transition-delay: var(--blog-preview-delay, 0ms);
        }

        .blog-preview-card.is-visible {
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .blog-preview-card,
          .blog-preview-card.is-visible {
            transform: none;
            transition: none;
          }
        }
      </style>

      <a
        data-blog-card
        href="${this.blogUrl}"
        aria-label="Read ${this.header}"
        class="blog-preview-card surface-card surface-card-link group flex h-full min-h-[16rem] w-full flex-col
               gap-3 p-[var(--layout-pad-card)] text-left text-foreground"
      >
        <span class="type-eyebrow">${category}</span>

        <h2 class="type-card mt-3">${this.header}</h2>

        <p class="type-compact line-clamp-3 text-muted">${this.description}</p>

        <div class="type-meta mt-auto flex items-center gap-2 pt-6 text-muted">
          <span class="truncate">${this.writer}</span>
          <span aria-hidden="true">·</span>
          <span class="shrink-0">${readTime} min read</span>
          <span aria-hidden="true" class="ml-auto text-primary transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
        </div>
      </a>
    `;
  }
}
