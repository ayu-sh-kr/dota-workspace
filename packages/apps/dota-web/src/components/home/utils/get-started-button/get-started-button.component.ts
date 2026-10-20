import {BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

import {routerService} from "@dota/main.ts";


@Component({
  selector: 'get-started-button',
  shadow: false
})
export class GetStartedButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  @HostListener({event: 'click'})
  onClickListener() {
    routerService.route("/docs/getting-started");
  }

  render(): TemplateResult {
    return html`
      <button type="button" class="button-primary w-full">Getting Started</button>
    `;
  }

}
