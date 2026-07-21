import {BaseElement, Component, HTML, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {LifecycleEventConstants} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";
import {
  IconStyle,
  type IconColor,
  type IconSize,
  type IconStyleConfig,
  type IconVariant,
} from "@dota/components/icon/icons.config.ts";

const SVG_CACHE = new Map<string, string>();
const SVG_INFLIGHT = new Map<string, Promise<string | null>>();
const ICON_NAME_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/i;

/**
 * Removes executable and externally-loading content from Iconify SVG markup.
 * The component injects the resulting SVG into light DOM, so this keeps the
 * cached asset limited to presentational SVG elements and attributes.
 * @param rawSvg Markup returned by Iconify for one validated icon name.
 * @returns Safe serialized SVG markup, or `null` when the response is not an SVG.
 */
function sanitizeSvg(rawSvg: string): string | null {
  const document = new DOMParser().parseFromString(rawSvg, 'image/svg+xml');
  const svg = document.documentElement;
  if (svg.localName !== 'svg' || document.querySelector('parsererror')) return null;

  svg.querySelectorAll('script, style, foreignObject, iframe, object, embed, audio, video').forEach(element => element.remove());
  svg.querySelectorAll('*').forEach(element => {
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || (name === 'href' || name === 'xlink:href') && !value.startsWith('#')) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  svg.removeAttribute('style');
  svg.removeAttribute('class');
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Fetches one Iconify SVG and shares its sanitized result across all instances.
 * Keeping in-flight work by name prevents duplicate requests while preserving a
 * failed request as a retryable miss instead of permanently caching the failure.
 * @param name A validated `collection:icon` identifier.
 * @returns Sanitized SVG markup, or `null` if the icon cannot be loaded safely.
 */
function fetchSvg(name: string): Promise<string | null> {
  const cached = SVG_CACHE.get(name);
  if (cached) return Promise.resolve(cached);

  const inFlight = SVG_INFLIGHT.get(name);
  if (inFlight) return inFlight;

  const promise = fetch(`https://api.iconify.design/${name}.svg`)
    .then(response => response.ok ? response.text() : null)
    .then(rawSvg => rawSvg ? sanitizeSvg(rawSvg) : null)
    .then(svg => {
      if (svg) SVG_CACHE.set(name, svg);
      return svg;
    })
    .catch(error => {
      console.warn(`[dota-icon] Could not load "${name}".`, error);
      return null;
    })
    .finally(() => SVG_INFLIGHT.delete(name));

  SVG_INFLIGHT.set(name, promise);
  return promise;
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
 * State: a module-level cache retains sanitized SVG markup and shares in-flight fetches.
 * Events: connection and reactive attribute changes load the current icon; a name change
 * cannot overwrite a later selection after its request resolves. No custom events emit.
 * Lifecycle and integration: light DOM lets consumer Tailwind classes apply to the SVG.
 */
@Component({
  selector: 'dota-icon',
  shadow: false,
})
class IconsComponent extends BaseElement {

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

    const svgText = await fetchSvg(name);
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

  render(): string {
    const style = this.getStyle();
    return HTML`<span data-icon-root class="${style.container}" aria-hidden="${this.ariaLabel ? 'false' : 'true'}"></span>`;
  }
}

export {IconsComponent, IconStyle};
export type {IconColor, IconSize, IconStyleConfig, IconVariant};
