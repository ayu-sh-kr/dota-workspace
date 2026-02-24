import {BaseElement, Component, HTML, Property, String} from "@ayu-sh-kr/dota-core";
import {LifecycleEventConstants} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";
import type {IconSize, IconVariant, IconColor} from "@dota/components/icon/icons.config.ts";
import {IconStyle} from "@dota/components/icon/icons.config.ts";

/** Module-level cache: icon name → raw SVG string */
const SVG_CACHE = new Map<string, string>();

/** In-flight dedup: icon name → pending fetch Promise */
const SVG_INFLIGHT = new Map<string, Promise<string | null>>();

/**
 * Fetch (or return cached) raw SVG markup for the given icon name.
 * Concurrent requests for the same name share a single in-flight fetch.
 */
function fetchSvg(name: string): Promise<string | null> {
  if (SVG_CACHE.has(name)) {
    return Promise.resolve(SVG_CACHE.get(name)!);
  }

  if (SVG_INFLIGHT.has(name)) {
    return SVG_INFLIGHT.get(name)!;
  }

  const url = `https://api.iconify.design/${name}.svg?color=%23888888`;
  const promise = fetch(url)
    .then(res => {
      if (res.status !== 200) {
        console.warn(`[IconsComponent] HTTP ${res.status} for icon: ${name}`);
        return null;
      }
      return res.text();
    })
    .then(text => {
      if (!text || text === '404') {
        console.warn(`[IconsComponent] Icon not found: ${name}`);
        return null;
      }
      SVG_CACHE.set(name, text);
      return text;
    })
    .catch(err => {
      console.warn('[IconsComponent] Fetch error:', err);
      return null;
    })
    .finally(() => {
      SVG_INFLIGHT.delete(name);
    });

  SVG_INFLIGHT.set(name, promise);
  return promise;
}

/**
 * IconsComponent - A web component for displaying SVG icons with customizable size, color, and variants.
 *
 * Icons are fetched once and cached globally; subsequent uses of the same icon name
 * resolve instantly from cache. Color/variant changes are applied without re-fetching.
 *
 * @example
 * ```html
 * <dota-icon name="mdi:home" size="sm" color="primary" variant="solid"></dota-icon>
 * ```
 */
@Component({
  selector: 'dota-icon',
  shadow: false
})
class IconsComponent extends BaseElement {

  /** Icon name in format 'collection:icon-name' (e.g., 'mdi:home') */
  @Property({name: 'name', type: String})
  name!: string;

  /** Additional CSS classes to apply to the icon */
  @Property({name: 'classname', type: String})
  className!: string;

  /** Icon size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' */
  @Property({name: 'size', type: String})
  size!: IconSize;

  /** Icon color theme */
  @Property({name: 'color', type: String})
  color!: IconColor;

  /** Icon variant: 'solid' | 'outline' | 'soft' | 'ghost' | 'link' */
  @Property({name: 'variant', type: String})
  variant!: IconVariant;

  /** Tracks the last successfully injected icon name to avoid redundant DOM re-injection. */
  private _loadedName: string | null = null;

  constructor() {
    super();
  }

  /**
   * Triggered by the CONNECTED lifecycle event via the component's scoped EventChannel.
   * The scoped manager binds this during connectedCallback and unbinds on disconnectedCallback,
   * so it fires exactly once per connect — equivalent to @AfterInit but fully declarative.
   */
  @OnEvent(LifecycleEventConstants.CONNECTED, true)
  onConnected() {
    this.loadIcon()
      .catch(err => console.warn('[IconsComponent] load error on connect:', err));
  }

  /**
   * Triggered by the ATTRIBUTE_CHANGED lifecycle event via the component's scoped EventChannel.
   * Fires after BaseElement has already applied the new value to the property and re-rendered.
   *
   * Re-render wipes the inner HTML back to the empty container returned by render(), so for
   * any attribute change we must always re-inject the SVG from cache before styling.
   *
   * Uses event.data.name (the exact attribute that changed) to route with zero guesswork:
   *   - 'name'      → reset loaded guard so the new icon is fetched/injected
   *   - anything else → re-inject SVG from cache (instant) then re-style
   */
  @OnEvent(LifecycleEventConstants.ATTRIBUTE_CHANGED, true)
  onAttributeChanged(event: ApplicationEvent) {
    const { name } = event.data as { name: string; oldValue: string; newValue: string };
    if (name === 'name') {
      this._loadedName = null; // force re-injection for the new icon name
    }
    // Always reload: re-render has wiped the container, so we need to re-inject the SVG.
    this.loadIcon()
      .catch(err => console.warn('[IconsComponent] load error on attribute change:', err));
  }

  /**
   * Loads the SVG from the module-level cache (instant) or fetches from the network
   * (first request only; concurrent callers share the same in-flight Promise).
   * The raw SVG string is then injected into the container and styled.
   */
  async loadIcon() {
    const name = this.name;
    if (!name) return;

    const svgText = await fetchSvg(name);
    if (!svgText) {
      this.innerHTML = '';
      return;
    }

    const container = this.querySelector('#svg');
    if (!container) return;

    // Re-inject if the name changed OR if the container was wiped by a re-render
    if (this._loadedName !== name || !container.innerHTML.trim()) {
      container.innerHTML = svgText;
      this._loadedName = name;
    }

    this.applyStyles(container);
  }

  /**
   * Applies size, base, and color/variant styles to the already-injected SVG.
   * Can be called independently whenever color, variant, size, or classname changes
   * without re-fetching or re-injecting the SVG markup.
   */
  applyStyles(container: Element | null = this.querySelector('#svg')) {
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    // Reset class and re-apply so repeated calls don't accumulate stale classes
    svg.setAttribute('class', '');
    svg.classList.add(...(IconStyle.size[this.size] || IconStyle.size.sm).split(' '));
    svg.classList.add(...IconStyle.base.split(' '));

    if (this.color) {
      const colorVariants = IconStyle.color[this.color];
      if (colorVariants) {
        const variantClass = colorVariants[this.variant] ?? colorVariants.solid;
        svg.classList.add(...variantClass.split(' '));
      }
    }

    if (this.className) {
      svg.classList.add(...this.className.split(' '));
    }

    const path = container.querySelector('svg path');
    if (path) {
      path.setAttribute('fill', 'currentColor');
    }
  }

  render(): string {
    return HTML`
      <div id="svg" class="flex items-center justify-center"></div>
    `;
  }
}

export {IconsComponent, IconStyle}
export type {IconVariant, IconColor, IconSize}



