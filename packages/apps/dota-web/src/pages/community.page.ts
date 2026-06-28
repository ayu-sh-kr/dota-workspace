import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import { Route } from "@ayu-sh-kr/dota-wrap/router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/community'})
@Component({
  selector: "community-page",
  shadow: false
})
export class CommunityPage extends BaseElement {

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render() {
    // language=html
    return `
      <app-header></app-header>
      <page-wrapper>
        <community-component></community-component>
        <social-section></social-section>
      </page-wrapper>
      <app-footer></app-footer>
    `
  }
}