import {BaseElement, Component, DotaPageElement, Property, SEO, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/error', mode: 'csr'})
@Component({
  selector: 'app-error',
  shadow: false
})
export class ErrorPage extends DotaPageElement {

  @Property({name: 'path', type: String})
  path!: string;

  @Property({name: 'message', type: String})
  message!: string;

  @Property({name: 'status', type: String})
  status: number = 404

  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      favicon: '/favicon.svg',
      title: '404 Page Not Found - Dota Web',
      description: 'The requested page could not be found on Dota Web. Return to the homepage or open the documentation to continue.',
      keywords: ['Dota Web', '404', 'Page Not Found', 'Error Page', 'Documentation'],
      og: {
        title: '404 Page Not Found - Dota Web',
        description: 'The requested page could not be found on Dota Web. Return to the homepage or open the documentation to continue.',
      }
    }
  }

  @OnEvent("connected")
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render(): TemplateResult {
    return html`
      <app-header></app-header>
      <main class="layout-content flex min-h-[100svh] flex-col items-center justify-center gap-5 py-[var(--layout-page-top)] text-center">
        <span class="type-eyebrow">Error 404</span>
        <h1 class="type-title text-foreground">Page not found</h1>
        <p class="type-lede max-w-[48ch] text-muted">
          The document you're looking for doesn't exist or has been moved to another location.
        </p>
        <div class="mt-2 flex flex-wrap items-center justify-center gap-3">
          <a href="/" class="button-primary">Go home</a>
          <a href="/docs/getting-started" class="button-secondary">Read the docs</a>
        </div>
      </main>
    `
  }

}
