import {BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";

import {routerService} from "@dota/main.ts";


@Component({
  selector: 'get-started-button',
  shadow: false
})
export class GetStartedButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  @HostListener({event: 'click'})
  onClickListener() {
    routerService.route("/docs?content=Getting-Started.md");
  }

  render(): string {
    // language=HTML
    return `
      <div class="relative group">
        <div class="absolute -inset-px rounded-2xl bg-purple-500/20 blur-md opacity-45
                    transition duration-500 group-hover:opacity-[0.65] dark:bg-purple-300/[0.16]"
        >
        </div>
        <button
          class="relative rounded-2xl border border-white/15 bg-gray-950/[0.92] px-4 py-3
                 text-gray-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_46px_-36px_rgba(15,23,42,0.95)]
                 backdrop-blur-xl active:scale-95 transition-all
                 dark:bg-gray-50/[0.92] dark:text-gray-900 dark:border-white/70
                 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_46px_-36px_rgba(255,255,255,0.36)]">
          Getting Started
        </button>
      </div>
    `;
  }

}
