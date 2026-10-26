import {BaseElement, Component, html, Object as ObjectType, Property, String, type TemplateResult} from "@ayu-sh-kr/dota-core";
import {LifecycleEventConstants} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";
import {createDotaLogger} from '@ayu-sh-kr/dota-common-utils';
import {loadCachedIcon} from './icon-cache';
import {
  IconStyle,
  type IconColor,
  type IconSize,
  type IconStyleConfig,
  type IconVariant,
} from "@dota/components/icon/icons.config.ts";

const ICON_NAME_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/i;
const logger = createDotaLogger('dota-ui', 'components/icon/icons.component.ts');

/**
 * Loads a sanitized SVG from the configured source and shared persistent cache.
 * A local source can replace Iconify without changing component instances.
 * @param name A validated `collection:icon` identifier.
 * @param baseUrl Directory containing named SVG assets, without a trailing slash.
 * @returns Sanitized SVG markup, or `null` if the icon cannot be loaded safely.
 */
function fetchSvg(name: string, baseUrl: string): Promise<string | null> {
  return loadCachedIcon(`${baseUrl.replace(/\/$/, '')}/${name}.svg`)
    .catch(error => {
      logger.warn(`Could not load icon "${name}".`, error);
      return null;
    });
}

/**
 * Displays a cached Iconify SVG with a typed, per-instance visual theme.
 *
 * Inputs: `name` is a required `collection:icon` identifier and selects the remote SVG.
 * `size`, `color`, and `variant` select default style tokens, falling back to `md`, the
 * current text color, and `solid`. `classname` adds classes to the SVG itself; `config`
 * accepts an `IconStyleConfig` JSON attribute that replaces individual visual slots.
 * `aria-label` gives the icon an accessible image name; without it, the SVG is hidden as
 * decorative content. Unsupported style values fall back safely to their defaults.
 *
 * State: sanitized SVGs persist for seven days in browser storage and share in-flight work.
 * Failed refreshes retain stale SVGs; blocked storage falls back to memory caching.
 * Events: connection and reactive attribute changes load the current icon; a name change
 * cannot overwrite a later selection after its request resolves. No custom events emit.
 * Lifecycle and integration: light DOM lets consumer Tailwind classes apply to the SVG.
 */
@Component({
  selector: 'dota-icon',
  shadow: false,
})
class IconsComponent extends BaseElement {

  /** Asset directory used by every instance; defaults to Iconify. Set before app initialization. */
  static baseUrl = 'https://api.iconify.design';

  @Property({name: 'name', type: String})
  name = '';

  @Property({name: 'classname', type: String})
  className = '';

  @Property({name: 'size', type: String})
  size?: IconSize;

  @Property({name: 'color', type: String})
  color?: IconColor;

  @Property({name: 'variant', type: String})
  variant?: IconVariant;

  @Property({name: 'aria-label', type: String})
  ariaLabel: string | null = null;

  @Property({name: 'config', type: ObjectType})
  config?: IconStyleConfig;

  /** Applies a newly loaded SVG only when it still represents the active `name`. */
  private loadedName: string | null = null;

  constructor() {
    super();
  }

  @OnEvent(LifecycleEventConstants.CONNECTED, true)
  onConnected() {
    void this.loadIcon();
  }

  @OnEvent(LifecycleEventConstants.ATTRIBUTE_CHANGED, true)
  onAttributeChanged(event: ApplicationEvent) {
    const attributeName = (event.data as { name: string }).name;
    if (attributeName === 'name') this.loadedName = null;
    void this.loadIcon();
  }

  private getStyle() {
    const override = this.config;
    const size = this.size && this.size in IconStyle.size ? this.size : 'md';
    const color = this.color && this.color in IconStyle.color ? this.color : undefined;
    const variant = color && this.variant && this.variant in IconStyle.color[color] ? this.variant : 'solid';

    return {
      container: override?.container ?? IconStyle.container,
      base: override?.base ?? IconStyle.base,
      size: override?.size?.[size] ?? IconStyle.size[size],
      color: color
        ? override?.color?.[color]?.[variant] ?? IconStyle.color[color][variant]
        : '',
    };
  }

  /**
   * Inserts the current icon only after its request resolves for the still-active name.
   * This guard prevents a slow prior request from replacing SVG markup selected by a
   * later reactive attribute update.
   */
  private async loadIcon() {
    const name = this.name;
    const container = this.querySelector<HTMLElement>('[data-icon-root]');
    if (!container || !ICON_NAME_PATTERN.test(name)) {
      if (container) container.replaceChildren();
      return;
    }

    const svgText = await fetchSvg(name, IconsComponent.baseUrl);
    if (name !== this.name || !svgText) {
      if (name === this.name) container.replaceChildren();
      return;
    }

    if (this.loadedName !== name || !container.innerHTML.trim()) {
      container.innerHTML = svgText;
      this.loadedName = name;
    }
    this.applyStyles(container);
  }

  /**
   * Applies visual tokens and SVG accessibility semantics after markup injection.
   * Replacing the class list on every render prevents stale color and size tokens
   * when reactive attributes change without needing another network request.
   * @param container The current component-owned SVG wrapper.
   */
  private applyStyles(container: Element) {
    const svg = container.querySelector<SVGElement>('svg');
    if (!svg) return;

    const style = this.getStyle();
    svg.setAttribute('class', [style.base, style.size, style.color, this.className].filter(Boolean).join(' '));
    if (this.ariaLabel) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', this.ariaLabel);
      svg.removeAttribute('aria-hidden');
    } else {
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
    }
    svg.setAttribute('focusable', 'false');
  }

  render(): TemplateResult {
    const style = this.getStyle();
    return html`<span data-icon-root class="${style.container}" aria-hidden="${this.ariaLabel ? 'false' : 'true'}"></span>`;
  }
}

export {IconsComponent, IconStyle};
export type {IconColor, IconSize, IconStyleConfig, IconVariant};
