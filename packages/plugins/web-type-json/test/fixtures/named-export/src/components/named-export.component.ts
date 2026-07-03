import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "named-export-component",
  shadow: false
})
class NamedExportComponent extends BaseElement {
  @Property({ name: "label", type: String })
  label: string = "";

  render(): string {
    return `<div>${this.label}</div>`;
  }
}

export { NamedExportComponent }