import {BaseElement, Component} from "@ayu-sh-kr/dota-core";
import { Route } from "@dota/route.decorator";

@Route({
  path: '/',
})
@Component({selector: 'dota-home'})
export class HomeComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Home</div>';
  }
}

@Route({
  path: '/shop/product',
})
@Component({selector: 'dota-products'})
export class ProductsComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Products</div>';
  }
}

@Route({
  path: '/doc',
})
@Component({selector: 'dota-doc'})
export class DocComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Doc</div>';
  }
}

@Route({
  path: '/resource',
})
@Component({selector: 'dota-resource'})
export class ResourceComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Resource</div>';
  }
}

@Route({
  path: '/resource/about',
})
@Component({selector: 'dota-about'})
export class AboutComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>About</div>';
  }
}

@Route({
  path: '/resource/contact',
})
@Component({selector: 'dota-contact'})
export class ContactComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Contact</div>';
  }
}

@Component({selector: 'dota-dummy'})
export class DummyComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Dummy</div>';
  }
}

@Route({ path: '/error' })
@Component({selector: 'dota-error'})
export class ErrorComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    return '<div>Error: Page not found</div>';
  }
}

@Component({selector: 'app-root'})
export class AppComponent extends BaseElement {

  constructor() {
    super();
  }

  render() : string {
    return '<router-outlet></router-outlet>';
  }

}