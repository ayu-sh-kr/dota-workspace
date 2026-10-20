import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import type {AccordionStyleConfig} from "@ayu-sh-kr/dota-ui";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ACCORDION_CONFIG = {
  container: "faq-item",
  button: {
    base: "faq-question flex w-full items-center justify-between gap-6 py-5 text-left font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    size: {lg: ""},
    color: {purple: {ghost: ""}},
  },
  paragraph: "type-body max-w-[60ch] pb-6 text-muted",
} satisfies AccordionStyleConfig;

/**
 * Presents product and maintenance questions on the home page as a hairline-divided list of
 * Dota UI disclosures that sits directly on the page, without a surrounding panel.
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
               class="layout-section home-section-divider">

        <div class="layout-page faq-grid">
          <div class="faq-intro">
            <span class="type-eyebrow">
              FAQ
            </span>
            <h2 id="faq-heading" class="mt-3 max-w-lg type-section text-foreground">
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

          <div>
            <div class="faq-list" role="list">
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
