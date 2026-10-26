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
      <app-header></app-header>
      <main>
        <community-component></community-component>
        <social-section></social-section>
      </main>
      <app-footer></app-footer>
    `
  }
}
