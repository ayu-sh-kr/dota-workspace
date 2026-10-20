import {BaseElement, Boolean as BooleanType, Component, html, Object as ObjectType, Property, String, type TemplateResult} from "@ayu-sh-kr/dota-core";
import {LightDomSlot} from "@dota/components/utils/light-dom-slot.ts";
import type {ChipColor, ChipPosition} from "@dota/components/chip/chip.config.ts";
import {AvatarStyle} from "@dota/components/avatar/avatar.config.ts";
import type {AvatarColor, AvatarSize, AvatarStyleConfig, AvatarVariant} from "@dota/components/avatar/avatar.config.ts";

/**
 * Produces the one- or two-letter fallback shown when an avatar has a label.
 * Taking the first two non-empty words preserves recognisable initials without
 * turning names with extra words into an unreadable string.
 * @param label - Person or entity label supplied to `d-avatar`.
 * @returns Uppercase initials, or an empty string when no label is available.
 */
function getInitials(label: string | undefined): string {
  return (label ?? "")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Renders a person or entity as an image, label-derived initials, or a fallback icon.
 *
 * Inputs: `img` and `img-alt` render an image; otherwise `label` produces initials,
 * then `icon` is used as a fallback. `color` (`"gray"`) and `variant` (`"solid"`)
 * select the default visual token, while `size` (`"md"`) selects its dimensions.
 * `config` is a JSON `AvatarStyleConfig` attribute that replaces individual visual slots.
 * `is-chip`, `chip-text`, `chip-color`, and `chip-position` optionally wrap the avatar in
 * `dota-chip`; omitted chip color inherits `color`. No events are emitted.
 * Lifecycle and integration: light DOM keeps Tailwind classes available. The component
 * renders `avatar-wrapper` and, when enabled, `dota-chip`, so both must be registered by the host.
 */
@Component({
  selector: "d-avatar",
  shadow: false,
})
export class AvatarComponent extends BaseElement {
  @Property({name: "img", type: String})
  img: string = "";

  @Property({name: "img-alt", type: String})
  imgAlt: string = "";

  @Property({name: "label", type: String})
  label: string = "";

  @Property({name: "icon", type: String})
  icon: string = "";

  @Property({name: "is-chip", type: BooleanType, default: "false"})
  isChip: boolean = false;

  @Property({name: "chip-text", type: String, default: ""})
  chipText: string = "";

  @Property({name: "color", type: String, default: "gray"})
  color: AvatarColor = "gray";

  @Property({name: "chip-color", type: String})
  chipColor: ChipColor | "" = "";

  @Property({name: "chip-position", type: String, default: "top-right"})
  chipPosition: ChipPosition = "top-right";

  @Property({name: "variant", type: String, default: "solid"})
  variant: AvatarVariant = "solid";

  @Property({name: "size", type: String, default: "md"})
  size: AvatarSize = "md";

  @Property({name: "config", type: ObjectType})
  config: AvatarStyleConfig = {};

  constructor() {
    super();
  }

  /** Builds the content branch while keeping image, initials, and icon precedence explicit. */
  private renderContent(): TemplateResult {
    if (this.img) {
      return html`<img src="${this.img}" alt="${this.imgAlt}" class="${this.config?.image ?? AvatarStyle.image}">`;
    }

    if (this.label) {
      return html`<span class="${this.config?.initials ?? AvatarStyle.initials}">${getInitials(this.label)}</span>`;
    }

    return html`<dota-icon aria-hidden="true" name="${this.icon}" color="${this.color}" size="${this.size}" variant="${this.variant}" classname="${this.config?.icon ?? AvatarStyle.icon}"></dota-icon>`;
  }

  render(): TemplateResult {
    const avatar = html`
      <avatar-wrapper
        color="${this.color}"
        variant="${this.variant}"
        size="${this.size}"
        aria-label="${this.img ? "" : this.label}"
        config="${JSON.stringify(this.config ?? {})}">
        ${this.renderContent()}
      </avatar-wrapper>
    `;

    if (!this.isChip) {
      return avatar;
    }

    return html`
      <dota-chip
        text="${this.chipText}"
        color="${this.chipColor || this.color}"
        position="${this.chipPosition}">
        ${avatar}
      </dota-chip>
    `;
  }
}

/**
 * Provides the visual container used by `d-avatar` and remains available for direct composition.
 *
 * Inputs: `color` (`"gray"`), `variant` (`"solid"`), and `size` (`"md"`) resolve a
 * default token from `AvatarStyle`; `config` may replace the container, selected size, or
 * color/variant slot. `aria-label` makes non-image fallback content available to assistive tech.
 * Lifecycle and integration: moves its initial light-DOM content into the rendered container,
 * where it stays across attribute updates, allowing `d-avatar` to supply an image, initials,
 * or `dota-icon` child.
 */
@Component({
  selector: "avatar-wrapper",
  shadow: false,
})
export class AvatarWrapper extends BaseElement {

  @Property({name: "color", type: String, default: "gray"})
  color: AvatarColor = "gray";

  @Property({name: "variant", type: String, default: "solid"})
  variant: AvatarVariant = "solid";

  @Property({name: "size", type: String, default: "md"})
  size: AvatarSize = "md";

  @Property({name: "aria-label", type: String})
  ariaLabel: string = "";

  @Property({name: "config", type: ObjectType})
  config: AvatarStyleConfig = {};

  private readonly content = new LightDomSlot();

  /** Public so the class can be registered with `customElements.define` and app component lists. */
  constructor() {
    super();
  }

  /**
   * Renders with the authored avatar content moved into the container. The content is
   * detached just before the first render and returned right after it.
   */
  connectedCallback() {
    this.content.capture(this);
    super.connectedCallback();
    this.content.restore(this);
  }

  /** Resolves each visual slot independently so a config cannot erase sibling defaults. */
  private getStyle() {
    const color = this.color ?? "gray";
    const variant = this.variant ?? "solid";
    const size = this.size ?? "md";

    return {
      container: this.config?.container ?? AvatarStyle.container,
      size: this.config?.size?.[size] ?? AvatarStyle.size[size] ?? AvatarStyle.size.md,
      color: this.config?.color?.[color]?.[variant] ?? AvatarStyle.color[color]?.[variant] ?? AvatarStyle.color.gray.solid,
    };
  }

  render(): TemplateResult {
    const style = this.getStyle();

    // A label turns the container into a named image; otherwise it adds no semantics.
    return html`<span class="${style.container} ${style.size} ${style.color}" role="${this.ariaLabel ? "img" : "none"}" aria-label="${this.ariaLabel}" data-dota-slot></span>`;
  }
}

export {AvatarStyle as AvatarConfig};
export type {AvatarColor, AvatarSize, AvatarStyleConfig, AvatarVariant};
