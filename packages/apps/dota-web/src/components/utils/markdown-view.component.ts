import {BaseElement, Component, HTML, Property, String} from "@ayu-sh-kr/dota-core";
import {
  applyMarkdownTheme,
  flatMarkdownTheme,
  materialMarkdownTheme,
  type ColorName,
} from "@ayu-sh-kr/dota-md";


const THEMES = {
  flat:     flatMarkdownTheme,
  material: materialMarkdownTheme,
} as const;

type ThemeName = keyof typeof THEMES;

/**
 * MarkdownViewComponent — renders pre-converted HTML from MarkdownService
 * with full theme + color control via attributes.
 *
 * @example
 * ```html
 * <markdown-view theme="flat"     color="indigo"></markdown-view>
 * <markdown-view theme="material" color="teal"></markdown-view>
 * ```
 */
@Component({
  selector: 'markdown-view',
  shadow: false
})
export class MarkdownViewComponent extends BaseElement {

  /** Theme variant — 'flat' | 'material' */
  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  /** Color palette key — any ColorName from dota-md */
  @Property({name: 'color', type: String})
  color: ColorName = 'indigo';

  /**
   * Tailwind max-width utility class applied to the content wrapper.
   * Defaults to 'max-w-full'.
   */
  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-full';

  /** Pre-rendered HTML from MarkdownService.renderMarkdown(). Set by parent. */
  content: string = '';

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  render(): string {
    const themeName  = (this.theme  ?? 'flat')   as ThemeName;
    const colorName  = (this.color  ?? 'indigo') as ColorName;
    const maxWidth   =  this.maxWidth ?? 'max-w-full';

    const theme      = THEMES[themeName] ?? materialMarkdownTheme;
    const colorEntry = theme.color[colorName];
    const selection  = colorEntry?.selection ?? '';

    const themed = this.content
      ? applyMarkdownTheme(this.content, theme, colorName)
      : '';

    // Wrapper: selection utility sits here so Tailwind picks it up at build time
    return HTML`
            <div class="${maxWidth} mx-auto w-full
                         px-3 sm:px-5 lg:px-8
                         py-4 sm:py-6 lg:py-8
                         font-sans antialiased text-sm sm:text-base leading-6 sm:leading-7
                         ${selection}">
                ${themed}
            </div>
        `;
  }
}
