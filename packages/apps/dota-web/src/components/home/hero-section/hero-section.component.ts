import {BaseElement, BindEvent, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

import {notificationService} from "@dota/main.ts";

@Component({
  selector: 'app-hero',
  shadow: false
})
export class HeroSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  @BindEvent({event: 'click', id: '#copy'})
  copyText() {
    const text = 'npm install @ayu-sh-kr/dota-wrap/core'
    navigator.clipboard.writeText(text)
      .then(() => {
        notificationService.info({duration: 5000, message: 'Text Copied to Clipboard', title: 'Notification'})
      })
  }

  render(): TemplateResult {
    return html`
        <section class="home-hero">

            <!-- Central ambient orb glow with orbiting particles -->
            <orb-background
                orbit-position="center"
                orbit-count="7"
                orbit-spacing="15"
                orbit-speed="10"
                orbit-direction="anticlockwise"
                orbit-particle-size="0.8"
                orbit-particle-gap="20"
                orbit-size-mode="random"
                orbit-size="sm"
                orbit-color="purple"
            ></orb-background>

            <div class="home-hero-content layout-page">

                <!-- Brand eyebrow -->
                <span class="mb-6 type-eyebrow">
                    Dota Framework
                </span>

                <!-- Headline — punchy, short -->
                <h1 class="home-hero-title type-display">
                    Web Components,
                    <br/>
                    <span class="text-primary">done right.</span>
                </h1>

                <!-- Subheadline -->
                <p class="home-hero-description type-lede mt-5 text-muted">
                    A decorator-based TypeScript library for authoring standard Custom Elements &mdash;
                    no framework lock-in, no boilerplate, runs anywhere the web does.
                </p>

                <!-- Inline decorator chips — replaces heavy card grid -->
                <div class="mt-9 flex flex-wrap items-center justify-center gap-2">
                    <span class="home-hero-chip font-mono text-primary">
                        @Component
                    </span>
                    <span class="home-hero-chip font-mono text-primary">
                        @Property
                    </span>
                    <span class="home-hero-chip font-mono text-primary">
                        @BindEvent
                    </span>
                    <span class="text-foreground select-none px-0.5">&middot;</span>
                    <span class="home-hero-chip text-muted">
                        Zero lock-in
                    </span>
                    <span class="home-hero-chip text-muted">
                        No virtual DOM
                    </span>
                </div>

                <!-- CTAs -->
                <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
                    <get-started-button></get-started-button>
                    <a href="/docs"
                       class="button-secondary">
                        Browse the docs
                        <span class="text-base leading-none">&rarr;</span>
                    </a>
                </div>

                <!-- Install strip -->
                <div class="home-install surface-card">
                    <code class="type-code flex-1 min-w-0 overflow-x-auto select-all text-left">
                        npm install @ayu-sh-kr/dota-wrap/core
                    </code>
                    <button id="copy"
                            class="button-icon"
                            title="Copy to clipboard">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>

            </div>
        </section>
        `
  }

}
