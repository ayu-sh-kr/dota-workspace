import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {FrameworkStyleConfig} from "@dota/components/home/utils/device-preview/device-preview.component.ts";


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
      <section class="relative isolate layout-page layout-section home-section-divider">
        <h2 class="type-section text-foreground text-center mb-12">A single component library for
          all of your frameworks.
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 place-items-center gap-10">
          <device-preview label="React" image="/images/react-img.png" color="sky" shadow-color="${FrameworkStyleConfig.react}"></device-preview>
          <device-preview label="Angular" image="/images/angular-img.png" color="rose" shadow-color="${FrameworkStyleConfig.angular}"></device-preview>
          <device-preview label="Vue" image="/images/vue-img.png" color="emerald" shadow-color="${FrameworkStyleConfig.vue}"></device-preview>
          <device-preview label="Solid" image="/images/solid-logo.png" color="purple" shadow-color="${FrameworkStyleConfig.solid}"></device-preview>
        </div>
      </section>
    `;
  }
}
