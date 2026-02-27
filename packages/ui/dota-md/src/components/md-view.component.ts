import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";
import {type ThemeName, THEMES} from "@dota/themes.ts";
import {type ColorName} from "@dota/Types.ts";
import {materialMarkdownTheme} from "@dota/md-themes";
import {applyMarkdownTheme} from "@dota/renderer.ts";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import { type ApplicationEvent } from "@ayu-sh-kr/dota-event";

@Component({
  selector: "md-view",
  shadow: false
})
export class MdViewComponent extends BaseElement {

  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  @Property({name: 'color', type: String})
  color: ColorName = 'neutral'

  content: string = '';

  @OnEvent('md:theme-change')
  onThemeChange(event: ApplicationEvent<'md:theme-change'>) {
    const data = event.data;
    if (data.theme) {
      this.theme = data.theme as ThemeName;
      this.updateHTML();
      return;
    }
    console.warn('[MdViewComponent] Received md:theme-change event without theme data.');
  }

  @OnEvent('md:color-change')
  onColorChange(event: ApplicationEvent<'md:color-change'>) {
    const data = event.data;
    if (data.color) {
      this.color = data.color as ColorName;
      this.updateHTML();
      return;
    }
    console.warn('[MdViewComponent] Received md:color-change event without color data.');
  }

  @OnEvent('md:render')
  onContentChange(event: ApplicationEvent<'md:render'>) {
    const data = event.data;
    if (data && data.html) {
      this.content = data.html;
      this.updateHTML()
      return
    }
    console.warn('[MdViewComponent] Received md:render event without html data.');
  }

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  render() {
    const themeName  = (this.theme  ?? 'flat')   as ThemeName;
    const colorName  = (this.color  ?? 'indigo') as ColorName;

    const theme      = THEMES[themeName] ?? materialMarkdownTheme;
    const colorEntry = theme.color[colorName];
    const selection  = colorEntry?.selection ?? '';

    const themed = this.content
      ? applyMarkdownTheme(this.content, theme, colorName)
      : '';

    // language=html
    return `
            <div class="w-full
                         px-3 sm:px-5 lg:px-8
                         py-4 sm:py-6 lg:py-8
                         antialiased text-sm sm:text-base leading-6 sm:leading-7
                         ${selection}"
                 style="font-family: ${theme.fontFamily}">
                ${themed}
            </div>
        `;
  }
}