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
      <button
        class="spring-back
               active:translate-y-[2px] active:scale-[0.984]
               rounded-[12px] sm:rounded-[14px] md:rounded-[16px] lg:rounded-[18px]
               bg-gray-900
               px-5 py-2.5 sm:px-6 sm:py-3 lg:px-7
               text-sm sm:text-[15px] font-medium tracking-wide text-white
               shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]
               hover:bg-gray-800
               dark:bg-gray-50 dark:text-gray-900
               dark:shadow-[0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]
               dark:hover:bg-white">
        Getting Started
      </button>
    `;
  }

}