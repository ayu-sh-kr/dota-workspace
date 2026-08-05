import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";
import {type ThemeName, THEMES} from "@dota/themes.ts";
import {type ColorName, type Theme} from "@dota/Types.ts";
import {materialMarkdownTheme} from "@dota/md-themes";
import {applyMarkdownThemeToElement} from "@dota/renderer.ts";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import { type ApplicationEvent } from "@ayu-sh-kr/dota-event";
import {html, type TemplateResult, trustedHTML, type TrustedHtmlValue} from "@ayu-sh-kr/dota-rendering";

@Component({
  selector: "md-view",
  shadow: false
})
export class MdViewComponent extends BaseElement {

  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  @Property({name: 'color', type: String})
  color: ColorName = 'neutral'

  /** Latest parser-produced markup, retained independently from visual theme state. */
  content: string = '';
  /** Stable directive identity prevents theme updates from scheduling content replacement. */
  private contentMarkup: TrustedHtmlValue = trustedHTML('');

  constructor() {
    super();
    this.content = this.innerHTML;
    this.contentMarkup = trustedHTML(this.content);
  }

  /** Applies the initial visual theme after the trusted content range has mounted. */
  @AfterInit()
  afterViewInit(): void {
    this.applyThemeToContent();
  }

  /**
   * Patches wrapper styling and updates descendant classes without replacing content nodes.
   * @param event Theme selection published by the Markdown application channel.
   */
  @OnEvent('md:theme-change')
  onThemeChange(event: ApplicationEvent<'md:theme-change'>) {
    const data = event.data;
    if (data.theme) {
      this.theme = data.theme as ThemeName;
      this.updateHTML();
      this.applyThemeToContent();
      return;
    }
    console.warn('[MdViewComponent] Received md:theme-change event without theme data.');
  }

  /**
   * Applies a new accent color to existing Markdown elements in place.
   * @param event Color selection published by the Markdown application channel.
   */
  @OnEvent('md:color-change')
  onColorChange(event: ApplicationEvent<'md:color-change'>) {
    const data = event.data;
    if (data.color) {
      this.color = data.color as ColorName;
      this.updateHTML();
      this.applyThemeToContent();
      return;
    }
    console.warn('[MdViewComponent] Received md:color-change event without color data.');
  }

  /**
   * Replaces only the trusted Markdown range when the document output changes.
   * Theme application runs afterward against the newly parsed element instances.
   * @param event Parser result containing the next approved HTML document fragment.
   */
  @OnEvent('md:render')
  onContentChange(event: ApplicationEvent<'md:render'>) {
    const data = event.data;
    if (typeof data?.html === 'string') {
      this.content = data.html;
      this.contentMarkup = trustedHTML(data.html);
      this.updateHTML();
      this.applyThemeToContent();
      return;
    }
    console.warn('[MdViewComponent] Received md:render event without html data.');
  }

  /** Resolves the active theme with the library default as a defensive fallback. */
  private get activeTheme(): Theme {
    return THEMES[this.theme ?? 'flat'] ?? materialMarkdownTheme;
  }

  /**
   * Updates only renderer-owned classes on the mounted Markdown descendants.
   * Content nodes retain identity across theme and color changes so embedded
   * custom elements, selection, and browser-managed state are not reset.
   */
  private applyThemeToContent(): void {
    const container = this.querySelector('[data-md-content]');
    if (!container) return;
    applyMarkdownThemeToElement(container, this.activeTheme, this.color ?? 'indigo');
  }

  /** Produces a stable component shell whose content and visual parts patch independently. */
  render(): TemplateResult {
    const theme = this.activeTheme;
    const colorEntry = theme.color[this.color ?? 'indigo'];
    const selection  = colorEntry?.selection ?? '';

    return html`
            <div data-md-content class="w-full
                         px-3 sm:px-5 lg:px-8
                         py-4 sm:py-6 lg:py-8
                         antialiased text-sm sm:text-base leading-6 sm:leading-7
                         ${selection}"
                 style="${`font-family: ${theme.fontFamily}`}">
                ${this.contentMarkup}
            </div>
        `;
  }
}
