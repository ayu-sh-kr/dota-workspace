import {BaseElement, Component, DotaPageElement, Property, String, type SEO} from '@ayu-sh-kr/dota-wrap/core';
import {html} from '@ayu-sh-kr/dota-wrap/rendering';
import {Route} from '@ayu-sh-kr/dota-wrap/router';

/** Root host the router renders pages into. */
@Component({selector: 'app-root', shadow: false})
export class AppRoot extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return html``;
  }
}

/** Rendered per request: reads the route parameter and the request-backed location. */
@Route({path: '/tasks/:id', mode: 'ssr'})
@Component({selector: 'task-page', shadow: false})
export class TaskPage extends DotaPageElement {
  @Property({name: 'task-id', type: String}) taskId = '';
  @Property({name: 'seen-path', type: String}) seenPath = '';

  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: `Task ${this.taskId}`, description: 'Server-rendered task'};
  }

  serverLoad(context: {params: Readonly<Record<string, string>>}) {
    this.taskId = context.params.id;
    this.seenPath = location.pathname;
  }

  render() {
    return html`<h1>Task ${this.taskId}</h1><p>${this.seenPath}</p>`;
  }
}

/** Client-rendered: served the SPA shell. */
@Route({path: '/about', mode: 'csr'})
@Component({selector: 'about-page', shadow: false})
export class AboutPage extends DotaPageElement {
  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: 'About', description: ''};
  }

  render() {
    return html`<p>About</p>`;
  }
}

@Component({selector: 'home-page', shadow: false})
export class HomePage extends DotaPageElement {
  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: 'Home', description: ''};
  }

  render() {
    return html`<p>Home</p>`;
  }
}

@Component({selector: 'error-page', shadow: false})
export class ErrorPage extends DotaPageElement {
  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: 'Error', description: ''};
  }

  render() {
    return html`<p>Error</p>`;
  }
}
