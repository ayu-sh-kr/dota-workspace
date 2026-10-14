import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import {html, type TemplateResult, trustedHTML, type TrustedHtmlValue} from "@ayu-sh-kr/dota-rendering";
import {resolveTheme, type ThemeName} from "@dota/themes.ts";
import {type ColorKey, type Theme} from "@dota/Types.ts";
import {applyMarkdownThemeToElement, getSelectionClass} from "@dota/renderer.ts";
import {type MarkdownResult, MDService} from "@dota/services/md.service.ts";

/** Wrapper layout used when no `content-class` is set. */
const DEFAULT_CONTENT_CLASS = 'w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 antialiased text-sm sm:text-base leading-6 sm:leading-7';

/** Name of the DOM event `<md-view>` dispatches after new Markdown is mounted and themed. */
export const MD_RENDERED_EVENT = 'md-rendered';

/** Detail of the {@link MD_RENDERED_EVENT} DOM event. */
export interface MdRenderedDetail {
  /** The `[data-md-content]` element holding the rendered Markdown, ready for post-processing. */
  container: HTMLElement;
  /** The render result that produced the content, including its TOC. */
  result: MarkdownResult;
}

/**
 * `<md-view>` — renders themed Markdown HTML.
 *
 * Content arrives through the shared `md:render` event (`MDService.render(raw, { publish: true })`)
 * or through {@link MdViewComponent.renderMarkdown}, which updates only this view. Customise it by
 * composition: `content-class` styles the wrapper, and the bubbling {@link MD_RENDERED_EVENT}
 * (`md-rendered`) hands the mounted content to the host for post-processing.
 *
 * @example
 * ```html
 * <md-view theme="flat" color="indigo" content-class="article-body"></md-view>
 * ```
 * ```ts
 * @BindEvent({event: 'md-rendered', id: 'md-view'})
 * decorate(event: CustomEvent<MdRenderedDetail>) {
 *   event.detail.container.querySelector('h1')?.remove();
 * }
 * ```
 */
@Component({
  selector: "md-view",
  shadow: false
})
export class MdViewComponent extends BaseElement {

  /** Registered theme name (`flat`, `material`, `apple`, `github`, or one added with `registerTheme`). */
  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  /** Key of the theme's color map: a Tailwind color name or a custom key the theme defines. */
  @Property({name: 'color', type: String})
  color: ColorKey = 'neutral';

  /** Classes for the content wrapper; replaces the default padding and text sizing when set. */
  @Property({name: 'content-class', type: String})
  contentClass: string = DEFAULT_CONTENT_CLASS;

  /** Latest Markdown HTML, retained independently from the visual theme. */
  content: string = '';
  /** Stable directive identity so theme updates never replace content nodes. */
  private contentMarkup: TrustedHtmlValue = trustedHTML('');
  /** Render result behind the current content; absent for authored or prerendered content. */
  private result?: MarkdownResult;
  /** True while initialized and connected; content received earlier is flushed on init. */
  private ready = false;
  /** Theme and color stamped on adopted prerendered content, replaced on the first theming. */
  private prior?: {theme: Theme; color: ColorKey};

  /** Public so the class can be registered with `customElements.define` and app component lists. */
  constructor() {
    super();
  }

  /**
   * Adopts authored or prerendered light DOM as the initial content before the first mount.
   * Capturing here rather than in the constructor also works where children are not yet
   * visible during element upgrade (as in happy-dom prerendering).
   */
  connectedCallback(): void {
    if (!this.content) {
      // Prerendered views already contain the wrapper; adopt its children rather than nesting it.
      const prerendered = this.querySelector('[data-md-content]');
      this.content = prerendered?.innerHTML ?? this.innerHTML;
      this.contentMarkup = trustedHTML(this.content);
      // Its classes come from the serialized theme, which a saved preference may replace.
      if (prerendered) this.prior = {theme: resolveTheme(this.getAttribute('theme') ?? undefined), color: this.getAttribute('color') ?? 'neutral'};
    }
    super.connectedCallback();
  }

  /**
   * Themes the mounted content and flushes Markdown that arrived before initialization.
   * Overrides the lifecycle hook rather than using `@AfterInit`, whose metadata subclasses
   * do not inherit, so subclasses keep this behavior and their own `@AfterInit` handlers.
   */
  handleAfterInit(): void {
    this.ready = true;
    if (this.result) this.updateHTML();
    this.decorateContent();
    super.handleAfterInit();
  }

  /** Defers content updates while detached; the next initialization flushes them. */
  disconnectedCallback(): void {
    this.ready = false;
    super.disconnectedCallback();
  }

  /**
   * Renders Markdown into this view only, without broadcasting `md:render` to other views.
   * Safe to call before the view has initialized; the content mounts once it is ready.
   * @param markdown Raw Markdown source.
   * @returns The rendered HTML and TOC, e.g. for a page-specific table of contents.
   */
  renderMarkdown(markdown: string): MarkdownResult {
    const result = MDService.render(markdown);
    this.setContent(result);
    return result;
  }

  /** Switches theme in place on `md:theme-change`. */
  @OnEvent('md:theme-change')
  onThemeChange(event: ApplicationEvent<'md:theme-change'>) {
    if (!event.data?.theme) return;
    this.theme = event.data.theme as ThemeName;
    this.updateHTML();
    this.applyThemeToContent();
  }

  /** Switches accent color in place on `md:color-change`. */
  @OnEvent('md:color-change')
  onColorChange(event: ApplicationEvent<'md:color-change'>) {
    if (!event.data?.color) return;
    this.color = event.data.color as ColorKey;
    this.updateHTML();
    this.applyThemeToContent();
  }

  /** Replaces the content with a published render result. */
  @OnEvent('md:render')
  onContentChange(event: ApplicationEvent<'md:render'>) {
    if (typeof event.data?.html === 'string') this.setContent(event.data);
  }

  render(): TemplateResult {
    const theme = resolveTheme(this.theme);
    return html`
      <div data-md-content
           class="${`${this.contentClass ?? DEFAULT_CONTENT_CLASS} ${getSelectionClass(theme, this.color)}`}"
           style="${`font-family: ${theme.fontFamily}`}">
        ${this.contentMarkup}
      </div>
    `;
  }

  /** Stores a render result and mounts it once the view is ready; repeated results are ignored. */
  private setContent(result: MarkdownResult): void {
    if (result === this.result) return;
    this.result = result;
    this.prior = undefined;
    this.content = result.html;
    this.contentMarkup = trustedHTML(result.html);
    if (!this.ready) return;
    this.updateHTML();
    this.decorateContent();
  }

  /** Themes mounted content; rendered Markdown also gets lazy images and an `md-rendered` event. */
  private decorateContent(): void {
    const container = this.applyThemeToContent();
    if (!container || !this.result) return;
    container.querySelectorAll<HTMLImageElement>('img:not([loading])').forEach((image) => {
      image.loading = 'lazy';
      image.decoding = 'async';
    });
    this.dispatchEvent(new CustomEvent<MdRenderedDetail>(MD_RENDERED_EVENT, {
      bubbles: true,
      detail: {container, result: this.result},
    }));
  }

  /** Updates renderer-owned classes on mounted content without replacing its nodes. */
  private applyThemeToContent(): HTMLElement | null {
    const container = this.querySelector<HTMLElement>('[data-md-content]');
    if (container) applyMarkdownThemeToElement(container, resolveTheme(this.theme), this.color ?? 'neutral', this.prior);
    return container;
  }
}
