import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "emitter-section",
  shadow: false
})
export class EmitterSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
        <section role="region" aria-labelledby="emitter-heading"
                 class="hero-fade-up relative isolate font-sans w-full home-section-divider">
            <div class="layout-page layout-section">

                    <div class="layout-split">

                        <!-- Left: code (stacks below text on mobile) -->
                        <div class="w-full min-w-0 order-2 lg:order-1">
                            <!-- LOCKED CONTENT: Do not modify text; code extracted from page -->
                            <code-snippet filename="form.component.ts"
                                          language="typescript"
                                          data-locked="true">
                                @Component({ selector: 'app-form' })
                                class FormComponent extends BaseElement {
                                  
                                  constructor() { super(); }
                                  
                                  @Emitter({ name: 'form:reset' })
                                  onReset!: EventEmitter&lt;void&gt;;

                                  @BindEvent({ event: 'click', id: '#reset' })
                                  handleReset() {
                                    this.onReset.emit();
                                  }
                                }
                            </code-snippet>
                        </div>

                        <!-- Right: text -->
                        <div class="home-section-copy order-1 lg:order-2">
                            <span class="type-eyebrow">
                                Event Emitter
                            </span>
                            <h2 id="emitter-heading"
                                class="type-section text-foreground">
                                Custom Event Support.</h2>
                            <p class="type-lede text-muted">
                                Event Emitters
                                <span class="text-primary font-semibold">@Emitter</span>
                                are a core part of Dota-Core and are used to handle events in a
                                decoupled way. They allow you to emit events, making it easy to
                                emit custom events and listen for them in different parts of your code.
                            </p>

                            <!-- Value bullets -->
                            <ul class="flex flex-col gap-2.5">
                                <li class="flex items-start gap-2.5 text-sm text-muted">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary-subtle"></span>
                                    <span><code class="text-primary text-xs">@Emitter</code> emits typed custom events from any component method</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-muted">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary-subtle"></span>
                                    <span>Events bubble and cross shadow DOM boundaries by default</span>
                                </li>
                                <li class="flex items-start gap-2.5 text-sm text-muted">
                                    <span aria-hidden="true" class="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary-subtle"></span>
                                    <span>Listen, forward, and delegate events with minimal boilerplate</span>
                                </li>
                            </ul>
                        </div>

                    </div>
            </div>
        </section>
    `
  }
}
