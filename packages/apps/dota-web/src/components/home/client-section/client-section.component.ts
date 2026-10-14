import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {testimonials} from "@dota/constants/client.ts";

@Component({
  selector: "client-section",
  shadow: false
})
export class ClientSectionComponent extends BaseElement{

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <section id="clients" class="relative isolate layout-section home-section-divider">
        <div class="layout-page">
          <h2 class="type-section text-foreground text-center mb-12"> Trusted by Industry Leaders</h2>
          <div class="client-grid">
            ${testimonials.map((testimonial, index) => html`
              <article
                    class="surface-card client-card group flex flex-col gap-5 transition-all duration-300
                            hover:-translate-y-1 hover:border-primary-border"
                    tabindex="0"
                    style="animation-delay:${index * 60}ms"
                >
                    <div class="flex items-center gap-4">
                        <img
                            src="${testimonial.img}"
                            alt="${testimonial.name}"
                            class="h-12 w-12 rounded-full border border-default object-cover"
                        />
                        <div class="flex flex-col gap-1">
                            <div class="text-sm font-semibold tracking-wide text-foreground">
                                ${testimonial.name}
                            </div>
                            <div class="text-sm text-primary">
                                ${testimonial.title}
                            </div>
                        </div>
                    </div>
                    <p class="text-sm leading-relaxed text-muted">${testimonial.feedback}</p>
                </article>
            `)}
          </div>
        </div>
      </section>
    `;
  }
}
