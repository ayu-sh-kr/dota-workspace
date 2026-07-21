import {BaseElement, Boolean as BooleanType, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import type {ChipColor, ChipPosition} from "@dota/components/chip/chip.config.ts";
import {AvatarStyle} from "@dota/components/avatar/avatar.config.ts";
import type {AvatarColor, AvatarSize, AvatarStyleConfig, AvatarVariant} from "@dota/components/avatar/avatar.config.ts";

/**
 * Escapes text before it is placed in the component's HTML-string template.
 * Attribute and text values come from the element's public API, so encoding
 * them here prevents a consumer value from changing the generated markup.
 * @param value - Public attribute or property value to render.
 * @returns The value encoded for safe insertion into HTML text or attributes.
 */
function escapeHtml(value: string | number | undefined): string {
  const text = value === undefined ? "" : `${value}`;

  return text.replace(/[&<>"']/g, (character: string) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]!);
}

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
  private renderContent(): string {
    if (this.img) {
      return `<img src="${escapeHtml(this.img)}" alt="${escapeHtml(this.imgAlt)}" class="${escapeHtml(this.config?.image ?? AvatarStyle.image)}">`;
    }

    if (this.label) {
      return `<span class="${escapeHtml(this.config?.initials ?? AvatarStyle.initials)}">${escapeHtml(getInitials(this.label))}</span>`;
    }

    return `<dota-icon aria-hidden="true" name="${escapeHtml(this.icon)}" color="${escapeHtml(this.color)}" size="${escapeHtml(this.size)}" variant="${escapeHtml(this.variant)}" classname="${escapeHtml(this.config?.icon ?? AvatarStyle.icon)}"></dota-icon>`;
  }

  render(): string {
    const config = escapeHtml(JSON.stringify(this.config ?? {}));
    const avatar = `
      <avatar-wrapper
        color="${escapeHtml(this.color)}"
        variant="${escapeHtml(this.variant)}"
        size="${escapeHtml(this.size)}"
        aria-label="${escapeHtml(this.img ? "" : this.label)}"
        config="${config}">
        ${this.renderContent()}
      </avatar-wrapper>
    `;

    if (!this.isChip) {
      return avatar;
    }

    return `
      <dota-chip
        text="${escapeHtml(this.chipText)}"
        color="${escapeHtml(this.chipColor || this.color)}"
        position="${escapeHtml(this.chipPosition)}">
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
 * Lifecycle and integration: captures its initial light-DOM content and reuses it when attributes
 * update, allowing `d-avatar` to supply an image, initials, or `dota-icon` child.
 */
@Component({
  selector: "avatar-wrapper",
  shadow: false,
})
export class AvatarWrapper extends BaseElement {
  content: string;

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

  constructor() {
    super();
    this.content = this.innerHTML;
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

  render(): string {
    const style = this.getStyle();
    const accessibleLabel = this.ariaLabel ? ` role="img" aria-label="${escapeHtml(this.ariaLabel)}"` : "";

    return `<span class="${escapeHtml(`${style.container} ${style.size} ${style.color}`)}"${accessibleLabel}>${this.content}</span>`;
  }
}

export {AvatarStyle as AvatarConfig};
export type {AvatarColor, AvatarSize, AvatarStyleConfig, AvatarVariant};
