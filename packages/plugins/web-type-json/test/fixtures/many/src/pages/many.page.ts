import {DotaPageElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "many-page",
  shadow: false
})
export class ManyPage extends DotaPageElement {
  @Property({ name: "heading", type: String })
  heading: string = "many";
}
