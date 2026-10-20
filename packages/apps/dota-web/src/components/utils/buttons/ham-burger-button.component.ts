import {BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {NavigationSidebarComponent} from "@dota/components/sidebar";

@Component({
  selector: "ham-burger-button",
  shadow: false
})
export class HamBurgerButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  @HostListener({event:'click'})
  handleToggle(){
    const sidebar = document.querySelector<NavigationSidebarComponent>('navigation-sidebar');
    if(sidebar){
      sidebar.visible=!sidebar.visible
    }
  }

  render(): TemplateResult {
    return html`
      <button id="ham-button" class="md:hidden flex items-center justify-center active:scale-95">
        <dota-icon name="solar:hamburger-menu-linear" color="gray" variant="ghost" size="md"></dota-icon>
      </button>
    `
  }
}