import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { Route } from "@ayu-sh-kr/dota-wrap/router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/resources', mode: 'csr'})
@Component({
  selector: "resource-page",
  shadow: false
})
export class ResourcePage extends BaseElement {

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant')
  }

  render(): TemplateResult {
    return html`
      <app-header></app-header>
      <resource-section></resource-section>
      <app-footer></app-footer>
`
  }
}