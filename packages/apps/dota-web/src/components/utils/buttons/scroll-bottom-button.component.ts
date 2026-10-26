import {BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "scroll-bottom-button",
  shadow: false
})
export class ScrollBottomButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  @HostListener({event: 'click'})
  handleScroll() {
    window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
  }

  render(): TemplateResult {
    return html`
      <div id="scroll-bottom-button" class="fixed bottom-4 right-4 cursor-pointer">
        <dota-icon name="material-symbols:arrow-circle-down" color="purple" variant="ghost" size="xl"></dota-icon>
      </div>
    `
  }
}