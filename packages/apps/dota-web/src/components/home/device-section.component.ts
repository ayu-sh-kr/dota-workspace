import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {FrameworkStyleConfig} from "@dota/components/home/utils/device-preview.component.ts";


@Component({
  selector: "device-section",
  shadow: false,
})
export class DeviceSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): TemplateResult {
    // language=html
    return html`
      <section class="relative isolate font-dm mx-auto max-w-7xl px-6 py-20
                      before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r
                      before:from-transparent before:via-slate-200/70 before:to-transparent
                      dark:before:via-white/10 before:-z-10">
        <h1 class="text-3xl sm:text-4xl font-extrabold font-adaptive text-center mb-20">A single component library for
          all of your frameworks.
        </h1>
        <div class="grid grid-cols-2 md:grid-cols-4 place-items-center gap-10 ">
          <device-preview label="React" image="/images/react-img.png" color="sky" shadow-color="${FrameworkStyleConfig.react}"></device-preview>
          <device-preview label="Angular" image="/images/angular-img.png" color="rose" shadow-color="${FrameworkStyleConfig.angular}"></device-preview>
          <device-preview label="Vue" image="/images/vue-img.png" color="emerald" shadow-color="${FrameworkStyleConfig.vue}"></device-preview>
          <device-preview label="Solid" image="/images/solid-logo.png" color="purple" shadow-color="${FrameworkStyleConfig.solid}"></device-preview>
        </div>
      </section>
    `;
  }
}
