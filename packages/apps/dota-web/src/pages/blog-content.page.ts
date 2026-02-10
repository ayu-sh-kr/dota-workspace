import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-core";
import { Route } from "@ayu-sh-kr/dota-router";

@Route({path: '/blogs/content'})
@Component({
  selector: "blog-content",
  shadow: false
})
export class BlogContentPage extends BaseElement {

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    // Initialize component after it's added to the DOM
  }

  render() {
    // language=html
    return `
      <app-header></app-header>
      <page-wrapper>
        <blog-view></blog-view>
      </page-wrapper>
      <app-footer></app-footer>
    `
  }
}