import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { Route } from "@ayu-sh-kr/dota-wrap/router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/community', mode: 'ssr'})
@Component({
  selector: "community-page",
  shadow: false
})
export class CommunityPage extends BaseElement {

  constructor() {
    super();
  }

  @OnEvent("connected")
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render(): TemplateResult {
    return html`
      <div class="relative isolate">
        <cloud-chamber color="purple" vapor-intensity="1.7" vapor-density="1.35" vapor-glow="1.4"></cloud-chamber>
        <div class="relative z-10">
          <app-header></app-header>
          <section class="font-dm mx-auto max-w-7xl px-3 py-2 mt-10">
            <community-component></community-component>
            <social-section></social-section>
          </section>
          <app-footer></app-footer>
        </div>
      </div>
    `
  }
}
