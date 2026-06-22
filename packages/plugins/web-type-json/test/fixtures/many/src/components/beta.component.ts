import {BaseElement, Component, Property, Boolean} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "beta-component",
  shadow: false
})
export class BetaComponent extends BaseElement {
  @Property({ name: "enabled", type: Boolean, default: true })
  enabled: boolean = true;
}
