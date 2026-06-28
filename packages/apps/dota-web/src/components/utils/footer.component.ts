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
      <footer class="relative isolate font-dm mt-20 overflow-hidden
                     border-t border-slate-200/70 bg-white/48 backdrop-blur-2xl
                     shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]
                     dark:border-white/10 dark:bg-white/[0.035]
                     dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]
                     before:absolute before:inset-0 before:-z-10 before:opacity-[0.24]
                     before:bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.16)_1px,transparent_0)]
                     before:bg-[length:22px_22px] dark:before:opacity-[0.14]">
        <div class="px-3 lg:py-16 md:py-12 sm:py-8 py-6">
          <div class="px-5 grid grid-cols-2 md:grid-cols-4 mx-auto max-w-7xl   gap-4 ">
            <!-- Logo and Copyright -->
            <div>
              <h1 class="text-3xl font-semibold text-gray-900 dark:text-white text-start">Dota</h1>
            </div>

            <!-- Overview -->
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Overview</h3>
              <ul class="mt-2 space-y-2 dark:text-white">
                <li><a href="#" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Introduction</a></li>
                <li><a href="/docs/Getting-Started.md" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Getting
                  Started</a></li>
                <li><a href="/docs/Component-Registration.md" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Component
                  API</a></li>
                <li><a href="/docs/Guides.md" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Guides</a></li>
                <li><a href="#" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <!-- Docs -->
            <div class="">
              <h3 class="font-semibold text-gray-900 dark:text-white">Docs</h3>
              <ul class="mt-2 space-y-2">
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Framework
                  Integrations</a></li>
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Static Site
                  Generation</a></li>
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Config</a></li>
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Output Targets</a>
                </li>
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Testing</a></li>
                <li><a href="/resources" class="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-300 transition-colors">Core Compiler API</a>
                </li>
              </ul>
            </div>

            <!-- Community -->
            <div class="">
              <h3 class="font-semibold text-gray-900 dark:text-white md:text-center">Community</h3>
              <ul class="mt-2 flex gap-2 items-center md:justify-center">
                <li>
                  <a href="#" class="text-gray-600 dark:text-gray-300 hover:underline" title="discord">
                    <dota-icon name="mdi:discord" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="#" class="text-gray-600 dark:text-gray-300 hover:underline" title="twitter">
                    <dota-icon name="mdi:twitter" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="#" class="text-gray-600 dark:text-gray-300 hover:underline" title="github">
                    <dota-icon name="mdi:github" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
                <li>
                  <a href="#" class="text-gray-600 dark:text-gray-300 hover:underline inline-flex pt-1.5" title="blog">
                    <dota-icon name="mdi:blogger" color="slate" variant="ghost" size="md"/>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <self-end></self-end>
        <p class="text-xs text-center mt-4 text-gray-500">&copy;${new Date().getFullYear()} Copyright Dota. All Rights
          Reserved</p>
      </footer>
    `
  }
}
