import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "single-component",
  shadow: false
})
export class SingleComponent extends BaseElement {
  @Property({ name: "label", type: String, default: "hello" })
  label: string = "hello";

  render(): string {
    return `<div>${this.label}</div>`;
  }
}
