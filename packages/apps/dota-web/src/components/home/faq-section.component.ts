import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import type {AccordionStyleConfig} from "@ayu-sh-kr/dota-ui";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ACCORDION_CONFIG = {
  container: "overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 transition-colors hover:border-purple-200 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-purple-400/30",
  button: {
    base: "flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-purple-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-500 dark:text-slate-100 dark:hover:bg-purple-400/10",
    size: {lg: ""},
    color: {purple: {ghost: ""}},
  },
  paragraph: "px-5 pb-5 text-sm leading-6 text-slate-600 dark:text-slate-400",
} satisfies AccordionStyleConfig;

/**
 * Presents product and maintenance questions on the home page as styled Dota UI disclosures.
 *
 * State: the component keeps a fixed private FAQ collection; each render maps it to one
 * `dota-accordion`, whose expanded state remains owned by that child component.
 * Events: this component does not register or emit events; each child accordion handles its
 * own header click, ARIA state, and disclosure animation.
 * Lifecycle and integration: light DOM lets the home page's Tailwind design apply to the
 * section. Every accordion receives `FAQ_ACCORDION_CONFIG` as JSON, so the shared accordion
 * behavior is retained while this section supplies its container, button, and paragraph theme.
 */
@Component({
  selector: "faq-section",
  shadow: false,
})
export class FaqSectionComponent extends BaseElement {
  private readonly faqs: FaqItem[] = [
    {
      question: "What is Dota built for?",
      answer: "Dota is a TypeScript-first ecosystem for building reusable, standards-based web components. It gives teams a small, consistent foundation for component composition, lifecycle, reactivity, and application wiring without tying the UI to a single framework.",
    },
    {
      question: "Can I use Dota with React, Vue, or Angular?",
      answer: "Yes. Dota components compile to native Custom Elements, so they can be used directly in any stack that supports web components. dota-wrap also provides the integration layer for composing Dota applications while keeping the component definition portable.",
    },
    {
      question: "Which packages are maintained in the ecosystem?",
      answer: "The ecosystem includes dota-core for component primitives, dota-router for client-side navigation, dota-rest for typed Fetch workflows, dota-event for decoupled messaging, dota-ui for ready-made controls, dota-md for rich documentation, and build tooling such as the Vite preloader.",
    },
    {
      question: "Does Dota include a UI component library?",
      answer: "Yes. dota-ui offers styled, accessible web components including buttons, inputs, dialogs, toasts, dropdowns, carousels, and accordions. They are designed to work with Dota projects or independently wherever Custom Elements are supported.",
    },
    {
      question: "How do routing, data fetching, and events fit together?",
      answer: "Each concern stays focused: dota-router handles navigation and route configuration, dota-rest provides a fluent typed client around Fetch, and dota-event offers typed publish-subscribe communication. Use only the packages your application needs.",
    },
    {
      question: "Where should I start or contribute?",
      answer: "Start with the documentation and the getting-started guide, then add packages incrementally as your app needs them. The project is maintained in the open; issues, bug reports, documentation improvements, and focused pull requests all help shape the ecosystem.",
    },
  ];

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <section aria-labelledby="faq-heading"
               class="relative isolate overflow-hidden font-dm px-6 py-20 sm:py-28">
        <div aria-hidden="true"
             class="absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2 bg-gradient-to-r from-transparent via-purple-200/40 to-transparent blur-3xl dark:via-purple-500/10"></div>

        <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div class="lg:pt-5">
            <span class="inline-flex items-center rounded-full border border-purple-200/80 bg-purple-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-purple-600 dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-300">
              FAQ
            </span>
            <h2 id="faq-heading" class="mt-5 max-w-lg text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Clear answers for building with Dota.
            </h2>
            <p class="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
              A quick guide to the maintained libraries, the problems they solve, and where they fit in your next application.
            </p>
            <a href="/docs?content=Getting-Started.md"
               class="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition-colors hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-500 dark:text-purple-300 dark:hover:text-purple-200">
              Read the getting-started guide
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div class="rounded-3xl border border-white/70 bg-white/70 p-3 shadow-[0_24px_80px_-44px_rgba(76,29,149,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_80px_-44px_rgba(0,0,0,0.9)] sm:p-4">
            <div class="space-y-2" role="list">
              ${this.faqs.map((faq) => html`
                <div role="listitem">
                  <dota-accordion
                    header="${faq.question}"
                    description="${faq.answer}"
                    color="purple"
                    variant="ghost"
                    size="lg"
                    config='${JSON.stringify(FAQ_ACCORDION_CONFIG)}'>
                  </dota-accordion>
                </div>
              `)}
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
