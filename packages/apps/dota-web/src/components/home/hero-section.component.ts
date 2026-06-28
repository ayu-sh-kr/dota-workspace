import {BaseElement, BindEvent, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";
import {CIRCULAR_BLOB_A} from "@ayu-sh-kr/dota-ui";

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
        <section class="relative isolate overflow-hidden font-dm min-h-screen flex flex-col justify-center
                        bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.96),rgba(248,250,252,0.92)_42%,rgba(241,245,249,0.86)_100%)]
                        dark:bg-[radial-gradient(circle_at_50%_16%,rgba(30,41,59,0.74),rgba(2,6,23,0.96)_54%,rgba(2,6,23,1)_100%)]
                        before:absolute before:inset-0 before:-z-10
                        before:bg-[linear-gradient(115deg,rgba(255,255,255,0.68),rgba(255,255,255,0.18)_38%,rgba(148,163,184,0.12))]
                        dark:before:bg-[linear-gradient(115deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025)_42%,rgba(124,58,237,0.08))]
                        after:absolute after:inset-0 after:-z-10 after:opacity-[0.28] dark:after:opacity-[0.18]
                        after:bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.16)_1px,transparent_0)]
                        after:bg-[length:22px_22px]">

            <!-- Top-right quarter-arc decoration -->
            <svg class="absolute -top-px -right-px w-[min(520px,70vw)] h-[min(520px,70vw)] pointer-events-none opacity-[0.18] dark:opacity-[0.14]"
                 viewBox="0 0 520 520" fill="none" aria-hidden="true">
                <circle cx="520" cy="0" r="100" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="520" cy="0" r="190" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="520" cy="0" r="280" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="520" cy="0" r="370" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="520" cy="0" r="460" stroke="#7c3aed" stroke-width="2"/>
            </svg>

            <!-- Bottom-left mirror arc -->
            <svg class="absolute -bottom-px -left-px w-[min(340px,50vw)] h-[min(340px,50vw)] pointer-events-none opacity-[0.14] dark:opacity-[0.1]"
                 viewBox="0 0 340 340" fill="none" aria-hidden="true">
                <circle cx="0" cy="340" r="100" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="0" cy="340" r="200" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="0" cy="340" r="300" stroke="#7c3aed" stroke-width="2"/>
            </svg>

            <!-- Central ambient blob glow -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[580px] h-[580px] opacity-[0.055] dark:opacity-[0.075] blur-[135px] saturate-75
                        pointer-events-none select-none" aria-hidden="true">
                ${CIRCULAR_BLOB_A}
            </div>

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
