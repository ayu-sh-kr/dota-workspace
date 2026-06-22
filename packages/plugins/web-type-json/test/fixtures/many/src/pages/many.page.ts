import {DotaPageElement, Component, Property, String, SEO} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "many-page",
  shadow: false
})
export class ManyPage extends DotaPageElement {
  @Property({ name: "heading", type: String })
  heading: string = "many";

  get seo(): SEO {
    return {
      title: "Many Page",
      description: "Many page fixture",
    };
  }

  render(): string {
    return `<main>${this.heading}</main>`;
  }
}
