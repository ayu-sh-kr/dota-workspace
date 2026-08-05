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
      <section id="clients" class="relative isolate py-24 font-dm
                                   before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r
                                   before:from-transparent before:via-slate-200/70 before:to-transparent
                                   dark:before:via-white/10 before:-z-10">
        <div class="mt-16 max-w-7xl mx-auto">
          <h1 class="text-3xl sm:text-4xl font-extrabold font-adaptive text-center mb-20"> Trusted by Industry Leaders</h1>
          <div class="grid place-items-center md:grid-cols-3 px-4 gap-14">
            ${testimonials.map((testimonial, index) => html`
              <article
                    class="group flex max-w-sm flex-col gap-5 rounded-2xl border border-white/70 bg-white/[0.58] p-6
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_60px_-46px_rgba(15,23,42,0.88)]
                           backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/30
                           hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_74px_-50px_rgba(15,23,42,0.95)]
                           dark:border-white/10 dark:bg-white/[0.045]
                           dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_64px_-48px_rgba(0,0,0,0.92)]"
                    tabindex="0"
                    style="animation-delay:${index * 60}ms"
                >
                    <div class="flex items-center gap-4">
                        <img
                            src="${testimonial.img}"
                            alt="${testimonial.name}"
                            class="h-12 w-12 rounded-full border border-gray-200/70 object-cover dark:border-gray-700/60"
                        />
                        <div class="flex flex-col gap-1">
                            <div class="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">
                                ${testimonial.name}
                            </div>
                            <div class="text-sm text-purple-400 dark:text-purple-300">
                                ${testimonial.title}
                            </div>
                        </div>
                    </div>
                    <p class="text-sm leading-relaxed text-gray-400 dark:text-gray-500">${testimonial.feedback}</p>
                </article>
            `)}
          </div>
        </div>
      </section>
    `;
  }
}
