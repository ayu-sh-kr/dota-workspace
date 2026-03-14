import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-core";

@Component({
    selector: "reactive-dota",
    shadow:false
})
export class ReactiveSectionComponent extends BaseElement{

    constructor() {
        super();
    }

    render():string{
        return HTML`
        <section role="region" aria-labelledby="reactive-heading"
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
                            <code-snippet filename="counter.component.ts"
                                          language="typescript"
                                          data-locked="true">
                                @Component({ selector: 'my-counter' })
                                export class Counter {
                                  @Property() count = 0

                                  @Watch('count')
                                  onCountChange(newVal, oldVal) {
                                    console.log('count changed', newVal)
                                  }

                                  @HostListener('click')
                                  increment() {
                                    this.count++
                                  }
                                }
                            </code-snippet>
                        </div>

                        <!-- Right: text -->
                        <div class="flex flex-col gap-5 lg:max-w-lg order-1 lg:order-2">
                            <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                         text-purple-400 dark:text-purple-300">
                                Reactive Components
                            </span>
                            <h2 id="reactive-heading"
                                class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                       text-gray-800 dark:text-gray-100/90 leading-tight">
                                Reactive Support.</h2>
                            <p class="text-base lg:text-lg text-gray-400 dark:text-gray-500 leading-relaxed">
                                With reactivity dom gets update each time a property marked as
                                <span class="text-purple-400 font-semibold not-italic">@Property</span>
                                gets its value changed.
                            </p>

                            <!-- Value bullets -->
                            <ul class="flex flex-col gap-2.5">
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@Property</code> triggers a re-render on every assignment</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@Watch</code> runs a side-effect when a specific property changes</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-purple-400/80"></span>
                                    <span><code class="text-purple-400/90 text-xs">@HostListener</code> wires native DOM events without boilerplate</span>
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