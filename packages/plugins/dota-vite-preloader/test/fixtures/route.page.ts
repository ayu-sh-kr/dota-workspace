import {BaseElement, Component} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";

@Route({
  path: "/",
  default: true
})
@Component({selector: "home-page"})
export class HomePage extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    throw new Error("Method not implemented.");
  }
}

@Route({
  path: "/docs",
  render: path => {
    return path;
  }
})
@Component({selector: "docs-page"})
export class DocsPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    throw new Error("Method not implemented.");
  }
}

@Component({selector: "not-a-route-page"})
export class NotARoutePage extends BaseElement {
  render(): string {
    throw new Error("Method not implemented.");
  }
}
