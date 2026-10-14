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
      <div class="flex flex-col justify-center items-center gap-y-4 rounded-card border border-default bg-surface
              px-5 py-6 shadow-lift backdrop-blur-2xl">
        <img src="${this.image}" alt="${this.label}" class="${this.shadowColor}"/>
        <dota-button label="${this.label}" color="${this.color}" variant="soft" round="md"></dota-button>
      </div>
    `
  }
}

export const FrameworkStyleConfig = {
  react: "framework-logo framework-react",
  angular: "framework-logo framework-angular",
  vue: "framework-logo framework-vue",
  solid: "framework-logo framework-solid",
}
