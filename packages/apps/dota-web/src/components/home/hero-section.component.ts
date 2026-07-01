import {BaseElement, BindEvent, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

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

  render(): string {
    return HTML`
        <section class="relative isolate overflow-hidden font-dm min-h-screen flex flex-col justify-center bg-white/[0.58] dark:bg-white/[0.045] backdrop-blur-2xl">

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

            <div class="relative flex flex-col items-center justify-center pt-28 sm:pt-32 pb-16 sm:pb-24 px-5 text-center">

                <!-- Brand eyebrow -->
                <span class="mb-6 text-xs font-semibold tracking-[0.2em] uppercase text-purple-500 dark:text-purple-400">
                    Dota Framework
                </span>

                <!-- Headline — punchy, short -->
                <h1 class="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold
                           text-gray-900 dark:text-gray-50
                           w-full max-w-3xl leading-[1.07] tracking-tight text-center">
                    Web Components,
                    <br/>
                    <span class="text-purple-500 dark:text-purple-400">done right.</span>
                </h1>

                <!-- Subheadline -->
                <p class="mt-5 text-gray-500 dark:text-gray-400 text-sm sm:text-lg w-full max-w-lg leading-relaxed font-normal">
                    A decorator-based TypeScript library for authoring standard Custom Elements &mdash;
                    no framework lock-in, no boilerplate, runs anywhere the web does.
                </p>

                <!-- Inline decorator chips — replaces heavy card grid -->
                <div class="mt-9 flex flex-wrap items-center justify-center gap-2">
                    <span class="inline-flex items-center px-3 py-1.5 rounded-lg
                                 bg-white/55 dark:bg-white/[0.055] backdrop-blur-xl
                                 border border-white/70 dark:border-white/10
                                 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.7)]
                                 text-xs font-mono font-medium text-purple-500 dark:text-purple-400">
                        @Component
                    </span>
                    <span class="inline-flex items-center px-3 py-1.5 rounded-lg
                                 bg-white/55 dark:bg-white/[0.055] backdrop-blur-xl
                                 border border-white/70 dark:border-white/10
                                 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.7)]
                                 text-xs font-mono font-medium text-purple-500 dark:text-purple-400">
                        @Property
                    </span>
                    <span class="inline-flex items-center px-3 py-1.5 rounded-lg
                                 bg-white/55 dark:bg-white/[0.055] backdrop-blur-xl
                                 border border-white/70 dark:border-white/10
                                 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.7)]
                                 text-xs font-mono font-medium text-purple-500 dark:text-purple-400">
                        @BindEvent
                    </span>
                    <span class="text-gray-300 dark:text-gray-600 select-none px-0.5">&middot;</span>
                    <span class="inline-flex items-center px-3 py-1.5 rounded-lg
                                 bg-white/55 dark:bg-white/[0.055] backdrop-blur-xl
                                 border border-white/70 dark:border-white/10
                                 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.7)]
                                 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Zero lock-in
                    </span>
                    <span class="inline-flex items-center px-3 py-1.5 rounded-lg
                                 bg-white/55 dark:bg-white/[0.055] backdrop-blur-xl
                                 border border-white/70 dark:border-white/10
                                 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.7)]
                                 text-xs font-medium text-gray-500 dark:text-gray-400">
                        No virtual DOM
                    </span>
                </div>

                <!-- CTAs -->
                <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
                    <get-started-button></get-started-button>
                    <a href="/docs"
                       class="text-sm font-medium text-gray-400 dark:text-gray-500
                              hover:text-purple-500 dark:hover:text-purple-400
                              transition-colors duration-200 flex items-center gap-1">
                        Browse the docs
                        <span class="text-base leading-none">&rarr;</span>
                    </a>
                </div>

                <!-- Install strip -->
                <div class="mt-8 flex w-full max-w-xs sm:max-w-sm items-center gap-2 px-4 py-2.5 rounded-xl
                            bg-white/60 dark:bg-white/[0.055] backdrop-blur-2xl
                            border border-white/75 dark:border-white/10
                            shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_56px_-42px_rgba(15,23,42,0.9)]
                            dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_60px_-44px_rgba(0,0,0,0.9)]">
                    <code class="flex-1 min-w-0 truncate text-xs sm:text-sm font-mono text-gray-500 dark:text-gray-400 select-all text-left">
                        npm install @ayu-sh-kr/dota-wrap/core
                    </code>
                    <button id="copy"
                            class="p-1 rounded-md text-gray-400
                                   hover:bg-gray-200/60 dark:hover:bg-gray-700/50
                                   hover:text-gray-600 dark:hover:text-gray-300
                                   transition-colors duration-150"
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
