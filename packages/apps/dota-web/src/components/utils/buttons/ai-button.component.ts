import {BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

import {routerService} from "@dota/main.ts";


@Component({
  selector: 'ai-button',
  shadow: false,
})
export class AiButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  @HostListener({event: 'click'})
  hostClickListener() {
    routerService.route('/chat');
  }

  render(): TemplateResult {
    return html`
      <span id="github-button" class="active:scale-95 cursor-pointer">
        <a target="_blank">
            <dota-icon name="healthicons:artificial-intelligence" color="pink" variant="ghost" size="md"></dota-icon>
        </a>
      </span>
    `;
  }

}
