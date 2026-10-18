import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

@Component({
  selector: "app-footer",
  shadow: false
})
export class FooterComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    // language=HTML
    return HTML`
      <footer class="app-footer">
        <div class="layout-page">
          <div class="layout-card-grid">
            <!-- Logo and Copyright -->
            <div>
              <a href="/" class="inline-flex items-center gap-1 text-3xl font-semibold text-foreground hover:text-primary transition-colors">
                <span class="app-footer-symbol" aria-hidden="true"></span>
                Dota
              </a>
            </div>

            <!-- Overview -->
            <div>
              <h3 class="font-semibold text-foreground">Overview</h3>
              <ul class="mt-2 space-y-2">
                <li><a href="#" class="text-muted hover:text-primary transition-colors">Introduction</a></li>
                <li><a href="/docs/getting-started" class="text-muted hover:text-primary transition-colors">Getting
                  Started</a></li>
                <li><a href="/docs/component-registration" class="text-muted hover:text-primary transition-colors">Component
                  API</a></li>
                <li><a href="/docs/guides" class="text-muted hover:text-primary transition-colors">Guides</a></li>
                <li><a href="#" class="text-muted hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            <!-- Docs -->
            <div class="">
              <h3 class="font-semibold text-foreground">Docs</h3>
              <ul class="mt-2 space-y-2">
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Framework
                  Integrations</a></li>
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Static Site
                  Generation</a></li>
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Config</a></li>
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Output Targets</a>
                </li>
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Testing</a></li>
                <li><a href="/resources" class="text-muted hover:text-primary transition-colors">Core Compiler API</a>
                </li>
              </ul>
            </div>

            <!-- Community -->
            <div class="">
              <h3 class="font-semibold text-foreground md:text-center">Community</h3>
              <ul class="mt-2 flex gap-2 items-center md:justify-center">
                <li>
                  <a href="#" class="text-muted hover:underline" title="discord">
                    <dota-icon name="mdi:discord" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="#" class="text-muted hover:underline" title="twitter">
                    <dota-icon name="mdi:twitter" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="#" class="text-muted hover:underline" title="github">
                    <dota-icon name="mdi:github" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="/blogs" class="text-muted hover:underline inline-flex pt-1.5" title="blog">
                    <dota-icon name="mdi:blogger" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <self-end></self-end>
        <p class="text-xs text-center mt-4 text-muted">&copy;${new Date().getFullYear()} Copyright Dota. All Rights
          Reserved</p>
      </footer>
    `
  }
}
