import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import type {AccordionStyleConfig} from "@ayu-sh-kr/dota-ui";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ACCORDION_CONFIG = {
  container: "overflow-hidden rounded-card border border-default bg-surface transition-colors hover:border-primary-border",
  button: {
    base: "flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus",
    size: {lg: ""},
    color: {purple: {ghost: ""}},
  },
  paragraph: "px-5 pb-5 text-sm leading-6 text-muted",
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
               class="relative isolate overflow-hidden layout-section">
        <div aria-hidden="true"
             class="absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2 bg-gradient-to-r from-transparent
                     via-primary-subtle to-transparent blur-3xl"></div>

        <div class="layout-page faq-grid">
          <div class="lg:pt-5">
            <span class="type-eyebrow">
              FAQ
            </span>
            <h2 id="faq-heading" class="mt-5 max-w-lg type-section text-foreground">
              Clear answers for building with Dota.
            </h2>
            <p class="mt-4 max-w-xl type-body text-muted">
              A quick guide to the maintained libraries, the problems they solve, and where they fit in your next application.
            </p>
            <a href="/docs/getting-started"
               class="button-link mt-7">
              Read the getting-started guide
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div class="rounded-card border border-default bg-surface p-3 shadow-lift backdrop-blur-xl sm:p-4">
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
