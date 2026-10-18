import {BaseElement, Component, BindEvent, Property, String, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";


@Component({
  selector: 'dark-mode-button',
  shadow: false
})
export class DarkModeButtonComponent extends BaseElement {

  @Property({
   name: 'color',
    type: String
  })
  color: string = 'purple';

  constructor() {
    super();
  }

  @BindEvent({event: 'click', id: '#dark-button'})
  handleDark() {
    GeneralUtils.toggleDarkMode();
  }

  @WindowListener({event: 'themeChange'})
  handleThemeChange() {
    this.updateHTML();
  }

  render(): string {
    const isDarkTheme = GeneralUtils.isDarkMode();
    const icon = isDarkTheme ? 'material-symbols:dark-mode' : 'material-symbols:sunny-rounded';
    // language=html
    return `
      <button id="dark-button" type="button"
              class="inline-flex size-9 items-center justify-center rounded-full text-primary hover:bg-raised
                      active:scale-95 cursor-pointer"
              aria-label="Switch to ${isDarkTheme ? 'light' : 'dark'} mode">
        <dota-icon name="${icon}" color="${this.color}" variant="ghost" size="lg"></dota-icon>
      </button>
    `;
  }

}
