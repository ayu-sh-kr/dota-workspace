import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

@Component({
  selector: "app-header",
  shadow: false,
})
export class HeaderComponent extends BaseElement {
  items: Link[] = [
    {
      name: "Documents",
      url: "/docs?content=Getting-Started.md",
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
           <header class="z-50 px-3 font-dm fixed top-4 left-0 w-full">
                <nav class="relative isolate flex min-h-14 items-center justify-between overflow-hidden
                            max-w-5xl rounded-full mx-auto px-3 sm:px-4
                            border border-white/70 bg-white/[0.58] backdrop-blur-2xl
                            shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_18px_58px_-44px_rgba(15,23,42,0.88)]
                            dark:border-white/10 dark:bg-white/[0.055]
                            dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_58px_-44px_rgba(0,0,0,0.92)]
                            before:absolute before:inset-0 before:-z-10 before:opacity-[0.22]
                            before:bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.14)_1px,transparent_0)]
                            before:bg-[length:18px_18px] dark:before:opacity-[0.12]">
                     <div class="flex min-w-0 items-center px-2 sm:px-3">
                        <a href="/"
                           class="inline-flex items-center rounded-full px-2 text-xl sm:text-2xl font-extrabold tracking-tight
                                  text-gray-950 transition-colors duration-200 hover:text-purple-500
                                  dark:text-gray-50 dark:hover:text-purple-300">
                            Dota
                        </a>
                     </div>
                    <div class="md:flex justify-center items-center hidden flex-1">
                        <ul class="flex items-center gap-x-1 rounded-full border border-white/60 bg-white/[0.36] p-1
                                   backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
                                ${this.items.map((item) => {
                                  return `
                                     <li>
                                        <a href="${item.url}"
                                           class="block rounded-full px-3 py-1.5 text-sm font-semibold
                                                  text-gray-600 transition-all duration-200
                                                  hover:bg-white/70 hover:text-gray-950
                                                  dark:text-gray-300 dark:hover:bg-white/[0.07] dark:hover:text-gray-50">
                                            ${item.name}
                                        </a>
                                     </li>
                                    `;
                                }).join("")}
                         </ul>
                      </div>
                      <div class="flex items-center gap-x-1 justify-end rounded-full border border-white/60 bg-white/[0.34] p-1
                                  backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
                        <span class="inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/70 dark:hover:bg-white/[0.07]">
                          <github-button></github-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/70 dark:hover:bg-white/[0.07]">
                          <dark-mode-button></dark-mode-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/70 dark:hover:bg-white/[0.07]">
                          <ai-button></ai-button>
                        </span>
                        <span class="inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/70 dark:hover:bg-white/[0.07]">
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
