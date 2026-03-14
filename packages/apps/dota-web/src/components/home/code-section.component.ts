import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-core";

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
        <section class="font-dm mx-auto max-w-7xl px-4 sm:px-6 py-10 mt-10">
            <div class="grid lg:grid-cols-2 gap-x-16 gap-y-10 items-center">
                <div class="space-y-5">
                    <h4 class="text-gray-700 dark:text-gray-300 font-semibold">Component Libraries</h4>
                    <h2 class="lg:text-5xl md:text-4xl text-3xl font-extrabold tracking-wide text-gray-950 dark:text-gray-100">
                        Web Component Tool.</h2>
                    <p class="text-gray-600 dark:text-gray-400 font-light lg:text-2xl md:text-xl text-lg">
                        Ensure consistent UX and brand experiences at scale with components that run on any platform or
                        device.
                        Build custom UIs that work seamlessly across teams and projects.
                    </p>
                </div>
                <div class="w-full min-w-0">
                <code-snippet filename="app-button.component.ts" language="typescript">import { Component, Property, HTML } from '@ayu-sh-kr/dota-core';

@Component({ selector: 'app-button' })
class ButtonComponent extends BaseElement {

  @Property({ name: 'label', type: String })
  label: string = 'Click me';

  render() {
    return HTML\`
      <button class="btn-primary">
        \${this.label}
      </button>
    \`;
  }
}</code-snippet>
                </div>
            </div>
        </section>
    `;
  }
}
