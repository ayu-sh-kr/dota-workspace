import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "no-content",
  shadow: false
})
export class NoContentComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
        <div class="grid sm:grid-cols-1 md:grid-cols-2 place-items-center overflow-hidden">
            <div class="flex flex-col items-center gap-3 py-10 text-center">
                <span class="type-eyebrow">Nothing here yet</span>
                <h2 class="type-section text-foreground">No content at the moment</h2>
            </div>
            <div class="">
                <img src="/svgs/no-content.svg" alt="no-content.svg" class="bg-transparent">
            </div>
        </div>
    `
  }
}