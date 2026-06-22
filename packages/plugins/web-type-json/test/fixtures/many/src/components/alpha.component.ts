import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "alpha-component",
  shadow: false
})
export class AlphaComponent extends BaseElement {
  @Property({ name: "title", type: String })
  title: string = "alpha";

  render(): string {
    return `<div>${this.title}</div>`;
  }
}
