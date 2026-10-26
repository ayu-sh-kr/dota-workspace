import {BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

import {notificationService} from "@dota/main.ts";

@Component({
  selector: "social-button",
  shadow: false
})
export class SocialButtonComponent extends BaseElement {

  @Property({
    name: "text",
    type: String
  })
  text!: string;

  @Property({
    name: "link",
    type: String
  })
  link!: string;

  constructor() {
    super();
  }

  @HostListener({event: 'click'})
  clickListener() {
    if (this.link && this.link !== "") {
      window.open(this.link, "_blank");
    } else {
      notificationService.info({
        duration: 5000,
        title: 'Not Available',
        message: 'Setup in progress, please try again later.',
      })
    }
  }

  render(): TemplateResult {
    return html`
      <button type="button" class="button-link">
        ${this.text}
        <span aria-hidden="true">&rarr;</span>
      </button>
    `
  }
}
