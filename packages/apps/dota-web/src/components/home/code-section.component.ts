import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

@Component({
  selector: "code-section",
  shadow: false,
})
export class CodeSectionComponent extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    // language=HTML
    return HTML`
        <section class="hero-fade-up relative isolate font-dm w-full
                        before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r
                        before:from-transparent before:via-slate-200/70 before:to-transparent
                        dark:before:via-white/10 before:-z-10">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <!-- Left: text -->
                        <div class="flex flex-col gap-5 lg:max-w-lg">
                            <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                         text-purple-400 dark:text-purple-300">
                                Component Libraries
                            </span>
                            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                       text-gray-800 dark:text-gray-100/90 leading-tight">
                                Web Component Tool.</h2>
                            <p class="text-base lg:text-lg text-gray-400 dark:text-gray-500
                                      leading-relaxed max-w-[60ch]">
                                Ensure consistent UX and brand experiences at scale with components that run on any platform or
                                device.
                                Build custom UIs that work seamlessly across teams and projects.
                            </p>
                        </div>

                        <!-- Right: code snippet -->
                        <div class="w-full min-w-0">
                            <code-snippet filename="app-button.component.ts" language="typescript">
                              import { Component, Property, HTML } from '@ayu-sh-kr/dota-wrap/core';
                                @Component({ selector: 'app-button' })
                                class ButtonComponent extends BaseElement {
                                
                                  @Property({ name: 'label', type: String })
                                  label: string = 'Click me';
                                
                                  render() {
                                    return HTML\`
                                      &lt;button class="btn-primary"&gt;
                                        \${this.label}
                                      &lt;/button&gt;
                                    \`;
                                  }
                                }
                            </code-snippet>
                        </div>

                    </div>
            </div>
        </section>
    `;
  }
}
