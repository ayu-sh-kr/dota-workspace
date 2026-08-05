import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "device-preview",
  shadow: false
})
export class DevicePreviewComponent extends BaseElement {

  @Property({
    name: 'label',
    type: String
  })
  label!: string;

  @Property({
    name: 'image',
    type: String
  })
  image!: string;

  @Property({
    name: 'color',
    type: String
  })
  color!: string;

  @Property({
    name: 'shadow-color',
    type: String
  })
  shadowColor!: string;

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    // Initialize component after it's added to the DOM
  }

  render(): TemplateResult {
    return html`
      <div class="flex flex-col justify-center items-center gap-y-4 rounded-3xl border border-white/70
                  bg-white/[0.45] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_58px_-48px_rgba(15,23,42,0.9)]
                  backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]
                  dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_58px_-48px_rgba(0,0,0,0.92)]">
        <img src="${this.image}" alt="dota-react" class="${this.shadowColor}"/>
        <dota-button label="${this.label}" color="${this.color}" variant="soft" round="md"></dota-button>
      </div>
    `
  }
}

export const FrameworkStyleConfig = {
  react: "framework-logo saturate-90 opacity-90 hover:drop-shadow-[0px_18px_28px_rgba(34,211,238,0.22)]",
  angular: "framework-logo saturate-90 opacity-90 hover:drop-shadow-[0px_18px_28px_rgba(220,38,38,0.20)]",
  vue: "framework-logo saturate-90 opacity-90 hover:drop-shadow-[0px_18px_28px_rgba(22,163,74,0.20)]",
  solid: "framework-logo saturate-90 opacity-90 hover:drop-shadow-[0px_18px_28px_rgba(147,51,234,0.22)]",
}
