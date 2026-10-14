import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "code-section",
  shadow: false,
})
export class CodeSectionComponent extends BaseElement {
  constructor() {
    super();
  }

  render(): TemplateResult {
    // language=HTML
    return html`
        <section class="hero-fade-up relative isolate font-sans w-full home-section-divider">
            <div class="layout-page layout-section">

                    <div class="layout-split">

                        <!-- Left: text -->
                        <div class="home-section-copy">
                            <span class="type-eyebrow">
                                Component Libraries
                            </span>
                            <h2 class="type-section text-foreground">
                                Web Component Tool.</h2>
                            <p class="type-lede text-muted max-w-[60ch]">
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
