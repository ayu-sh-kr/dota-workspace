import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "emitter-section",
  shadow: false
})
export class EmitterSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  render() {
    return HTML`
        <section role="region" aria-labelledby="emitter-heading"
                 class="hero-fade-up font-dm w-full">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                <!-- Inner card with soft elevation -->
                <div class="rounded-3xl border border-gray-200/60 dark:border-gray-700/30
                            bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm
                            px-6 sm:px-10 lg:px-16 py-12 lg:py-16">

                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <!-- Left: code (stacks below text on mobile) -->
                        <div class="w-full min-w-0 order-2 lg:order-1">
                            <!-- LOCKED CONTENT: Do not modify text; code extracted from page -->
                            <code-snippet filename="form.component.ts"
                                          language="typescript"
                                          data-locked="true">
                                import { Component, Emitter, BindEvent } from '@ayu-sh-kr/dota-core';

                                @Component({ selector: 'app-form' })
                                class FormComponent extends BaseElement {

                                  @Emitter({ name: 'form:submit' })
                                  onSubmit!: EventEmitter&lt;{ email: string }&gt;;

                                  @Emitter({ name: 'form:reset' })
                                  onReset!: EventEmitter&lt;void&gt;;

                                  @BindEvent({ event: 'click', id: '#submit' })
                                  handleSubmit() {
                                    this.onSubmit.emit({ email: 'user@example.com' });
                                  }

                                  @BindEvent({ event: 'click', id: '#reset' })
                                  handleReset() {
                                    this.onReset.emit();
                                  }
                                }
                            </code-snippet>
                        </div>

                        <!-- Right: text -->
                        <div class="flex flex-col gap-5 lg:max-w-lg order-1 lg:order-2">
                            <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                         text-purple-400 dark:text-purple-300">
                                Event Emitter
                            </span>
                            <h2 id="emitter-heading"
                                class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                       text-gray-800 dark:text-gray-100/90 leading-tight">
                                Custom Event Support.</h2>
                            <p class="text-base lg:text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
                                Event Emitters
                                <span class="text-purple-400 font-semibold">@Emitter</span>
                                are a core part of Dota-Core and are used to handle events in a
                                decoupled way. They allow you to emit events, making it easy to
                                emit custom events and listen for them in different parts of your code.
                            </p>

                            <!-- Value bullets -->
                            <ul class="flex flex-col gap-2.5">
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@Emitter</code> emits typed custom events from any component method</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span>Events bubble and cross shadow DOM boundaries by default</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span>Listen, forward, and delegate events with minimal boilerplate</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    `
  }
}