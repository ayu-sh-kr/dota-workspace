import {BaseElement, Component, BindEvent, Property, String, WindowListener} from "@ayu-sh-kr/dota-core";
import {type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-event";
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

  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const data = event.data;
    if (data && data.theme) {
      this.color = data.theme;
    }
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
      <span id="dark-button" class="active:scale-95 cursor-pointer">
        <dota-icon name="${icon}" color="${this.color}" variant="ghost" size="md"></dota-icon>
      </span>
    `;
  }

}