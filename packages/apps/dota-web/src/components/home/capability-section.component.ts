import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-core";

@Component({
    selector: "capability-section",
    shadow:false
})
export class CapabilitySectionComponent extends BaseElement{
    constructor() {
        super();
    }

    render():string{
        return HTML`
        <section role="region" aria-labelledby="capability-heading"
                 class="hero-fade-up font-dm w-full">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                <!-- Inner card with soft elevation -->
                <div class="rounded-3xl border border-gray-200/60 dark:border-gray-700/30
                            bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm
                            px-6 sm:px-10 lg:px-16 py-12 lg:py-16">

                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <!-- Left: text -->
                        <div class="flex flex-col gap-5 lg:max-w-lg">
                            <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                         text-purple-400 dark:text-purple-300">
                                Custom Decorators
                            </span>
                            <h2 id="capability-heading"
                                class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                       text-gray-800 dark:text-gray-100/90 leading-tight">
                                Event Listener</h2>
                            <p class="text-base lg:text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
                                The
                                <span class="text-purple-400 font-semibold">@HostListener</span>
                                decorator binds a method to a specified event on the host element
                                or its shadow root. It is used to listen for events such as
                                'click', 'mouseover', etc., and execute the decorated method
                                when the event is triggered.
                            </p>

                            <!-- Value bullets -->
                            <ul class="flex flex-col gap-2.5">
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@BindEvent</code> wires any DOM event to a method by element ID</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@HostListener</code> listens for events on the host element directly</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@WindowListener</code> captures global window events from any component</span>
                                </li>
                            </ul>
                        </div>

                        <!-- Right: code snippet -->
                        <div class="w-full min-w-0">
                            <!-- LOCKED CONTENT: Do not modify text; code extracted from page -->
                            <code-snippet filename="modal.component.ts"
                                          language="typescript"
                                          data-locked="true">
                                import { Component, BindEvent, HTML } from '@ayu-sh-kr/dota-core';

                                @Component({ selector: 'app-modal' })
                                class ModalComponent extends BaseElement {

                                  @BindEvent({ event: 'click', id: '#open' })
                                  openModal() {
                                    this.setAttribute('open', 'true');
                                  }

                                  @BindEvent({ event: 'click', id: '#close' })
                                  closeModal() {
                                    this.removeAttribute('open');
                                  }

                                  @BindEvent({ event: 'mouseenter', id: '#open' })
                                  prefetch() {
                                    console.log('prefetching modal content...');
                                  }
                                }
                            </code-snippet>
                        </div>

                    </div>
                </div>
            </div>
        </section>
        `
    }
}