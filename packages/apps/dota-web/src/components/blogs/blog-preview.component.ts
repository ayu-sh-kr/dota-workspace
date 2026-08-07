import {AfterInit, BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {type BlogCategory} from "@dota/configs/blogs.config.ts";

import {routerService} from "@dota/main.ts";

const categoryAccent: Record<BlogCategory, string> = {
  Rant: "text-orange-600 dark:text-orange-300",
  Tutorial: "text-blue-700 dark:text-blue-300",
  News: "text-emerald-700 dark:text-emerald-300",
  Tools: "text-purple-700 dark:text-purple-300",
  Others: "text-slate-600 dark:text-slate-300",
};

let revealObserver: IntersectionObserver | undefined;

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

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

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    routerService.route(this.blogUrl);
  }

  private get blogUrl(): string {
    return `/blogs/content/${encodeURIComponent(this.category)}/${encodeURIComponent(this.path)}`;
  }

  render(): string {
    const category = this.category in categoryAccent ? this.category : "Others";
    const accentClass = categoryAccent[category];
    const readTime = estimateReadTime(this.header, this.description);

    return `
      <style>
        .blog-preview-card {
          transform: translateY(1.25rem);
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
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
        aria-label="Read ${escapeHtml(this.header)}"
        class="blog-preview-card group relative flex h-full min-h-[16rem] w-full flex-col overflow-hidden rounded-[20px]
               border border-slate-200/90 bg-white p-[30px_28px_26px] text-left text-slate-950
               shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,background-color]
               duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5
               hover:bg-slate-50 hover:shadow-[0_18px_40px_-12px_rgba(15,23,42,0.16)]
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-500
               dark:border-slate-700/80 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700
               dark:shadow-[0_1px_2px_rgba(0,0,0,0.28)]
               dark:hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] font-dm"
      >
        <div>
          <span class="${accentClass} text-[11px] font-medium uppercase tracking-[0.04em]">
            ${escapeHtml(category)}
          </span>
        </div>

        <h2 class="mt-6 text-2xl font-medium leading-[1.18] tracking-[-0.02em] text-slate-950 text-balance dark:text-white">
          ${escapeHtml(this.header)}
        </h2>

        <p class="mt-2 line-clamp-3 text-[15px] leading-[1.55] text-slate-600 dark:text-slate-300">
          ${escapeHtml(this.description)}
        </p>

        <div class="mt-auto flex items-center gap-2 pt-8 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          <span class="truncate">${escapeHtml(this.writer)}</span>
          <span aria-hidden="true" class="size-[3px] shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"></span>
          <span class="shrink-0">${readTime} min read</span>
          <span aria-hidden="true" class="${accentClass} ml-auto text-lg leading-none opacity-80 transition-transform duration-[400ms]
                       ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
        </div>
      </a>
    `;
  }
}
