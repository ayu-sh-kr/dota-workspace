import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

@Component({
  selector: "app-header",
  shadow: false,
})
export class HeaderComponent extends BaseElement {
  items: Link[] = [
    {
      name: "Documents",
      url: "/docs/getting-started",
    },

    {
      name: "Resources",
      url: "/resources",
    },

    {
      name: "Community",
      url: "/community",
    },

    {
      name: "Blogs",
      url: "/blogs",
    },
  ];

  constructor() {
    super();
  }

  render(): string {
    return HTML`
           <header class="app-header">
                <nav class="app-header-nav">
                     <div class="flex min-w-0 items-center px-2 sm:px-3">
                        <a href="/"
                           class="inline-flex items-center rounded-full px-2 text-xl sm:text-2xl font-extrabold tracking-tight
                                   text-foreground transition-colors duration-200 hover:text-primary">
                            Dota
                        </a>
                     </div>
                    <div class="md:flex justify-center items-center hidden flex-1">
                        <ul class="flex items-center gap-x-1 rounded-full bg-surface p-1 backdrop-blur-xl">
                                ${this.items.map((item) => {
                                  return `
                                     <li>
                                        <a href="${item.url}"
                                           class="block rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition-all duration-200
                                                   hover:bg-surface hover:text-foreground">
                                            ${item.name}
                                        </a>
                                     </li>
                                    `;
                                }).join("")}
                         </ul>
                      </div>
                      <div class="flex items-center gap-x-1 justify-end rounded-full bg-surface p-1
                              backdrop-blur-xl">
                        <span class="inline-flex size-9 items-center justify-center rounded-full">
                          <github-button></github-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full">
                          <dark-mode-button></dark-mode-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full">
                          <ai-button></ai-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full">
                          <ham-burger-button></ham-burger-button>
                        </span>
                      </div>
                </nav>
            </header>
            <navigation-sidebar visible="false"></navigation-sidebar>
        `;
  }
}

export interface Link {
  name: string;
  url: string;
}
