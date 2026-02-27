import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "md-section",
  shadow: false
})
export class MdSectionComponent extends BaseElement {



  constructor() {
    super();
  }

  render() {
    // language=html
    return `
      <div class="p-4">
        <!-- Component content here -->
      </div>
    `
  }
}