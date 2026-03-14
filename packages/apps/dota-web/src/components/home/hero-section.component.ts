import {BaseElement, BindEvent, Component, HTML} from "@ayu-sh-kr/dota-core";

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
    const text = 'npm install @ayu-sh-kr/dota-core'
    navigator.clipboard.writeText(text)
      .then(() => {
        notificationService.info({duration: 5000, message: 'Text Copied to Clipboard', title: 'Notification'})
      })
  }

  render(): string {
    return HTML`
        <section class="relative overflow-hidden font-dm">

            <!-- Dot-grid background -->
            <div class="absolute inset-0 bg-[radial-gradient(circle,_#9333ea14_1px,_transparent_1px)] [background-size:28px_28px] pointer-events-none"></div>

            <!-- Ambient glow blobs -->
            <div class="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative flex flex-col items-center justify-center py-16 px-4 text-center">

                <!-- Brand name -->
                <span class="mb-6 text-xs font-bold tracking-[0.2em] uppercase text-purple-400 dark:text-purple-300">
                    Dota
                </span>

                <!-- Headline -->
                <h1 class="text-5xl sm:text-6xl font-extrabold text-gray-800 dark:text-gray-100/90
                           max-w-4xl leading-tight tracking-tight text-center">
                    Framework-Agnostic Web Components,
                    <span class="bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300 bg-clip-text text-transparent">
                        Powered by TypeScript.
                    </span>
                </h1>

                <!-- Subheadline -->
                <p class="mt-6 text-gray-400 dark:text-gray-500 text-lg max-w-xl leading-relaxed">
                    A decorator-based library for authoring standard Custom Elements &mdash;
                    no framework lock-in, no boilerplate, runs anywhere the web does.
                </p>

                <!-- Value bullets — 3-column card grid -->
                <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl w-full">
                    <div class="flex flex-col items-center gap-1.5 px-4 py-5 rounded-2xl
                                border border-gray-200/60 dark:border-gray-700/40
                                bg-white/50 dark:bg-gray-900/40 text-center">
                        <span class="w-1.5 h-1.5 rounded-full bg-purple-400/80 mb-0.5"></span>
                        <strong class="text-sm text-gray-700 dark:text-gray-300 font-semibold">Zero lock-in</strong>
                        <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">React, Vue, Angular, or plain HTML</span>
                    </div>
                    <div class="flex flex-col items-center gap-1.5 px-4 py-5 rounded-2xl
                                border border-gray-200/60 dark:border-gray-700/40
                                bg-white/50 dark:bg-gray-900/40 text-center">
                        <span class="w-1.5 h-1.5 rounded-full bg-purple-400/80 mb-0.5"></span>
                        <strong class="text-sm text-gray-700 dark:text-gray-300 font-semibold">Decorator API</strong>
                        <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                            <code class="text-purple-400/80">@Component</code>,
                            <code class="text-purple-400/80">@Property</code>,
                            <code class="text-purple-400/80">@BindEvent</code>
                        </span>
                    </div>
                    <div class="flex flex-col items-center gap-1.5 px-4 py-5 rounded-2xl
                                border border-gray-200/60 dark:border-gray-700/40
                                bg-white/50 dark:bg-gray-900/40 text-center">
                        <span class="w-1.5 h-1.5 rounded-full bg-purple-400/80 mb-0.5"></span>
                        <strong class="text-sm text-gray-700 dark:text-gray-300 font-semibold">Native performance</strong>
                        <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">Custom Elements, no virtual DOM</span>
                    </div>
                </div>

                <!-- CTAs -->
                <div class="mt-10 flex items-center justify-center gap-4">
                    <get-started-button></get-started-button>
                    <a href="/docs"
                       class="text-sm font-medium text-gray-400 dark:text-gray-500
                              hover:text-purple-400 dark:hover:text-purple-400
                              transition-colors duration-200 flex items-center gap-1">
                        Browse the docs
                        <span class="text-base leading-none">&rarr;</span>
                    </a>
                </div>

            </div>
        </section>
        `
  }

}