import {BaseElement, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {BadgeStyle} from "@dota/components/badge/badge.config.ts";
import type {BadgeColor, BadgeRounded, BadgeSize, BadgeStyleConfig, BadgeVariant} from "@dota/components/badge/badge.config.ts";

/**
 * Escapes attribute-provided text before it is inserted into the HTML-string template.
 * Light-DOM content remains markup so a consumer can intentionally compose the badge,
 * while the `label` API is always rendered as text.
 * @param value - Value from a public badge attribute.
 * @returns The HTML-encoded representation of that value.
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
 * Renders compact, non-interactive status or category text with shared UI color tokens.
 *
 * Inputs: `label` replaces the element's initial light-DOM content when non-empty; `classname`
 * adds host-specific classes. `color` (`"gray"`), `variant` (`"soft"`), `size` (`"md"`), and
 * `rounded` (`"full"`) resolve default visual slots. `subtle` remains accepted as a `soft` alias.
 * `config` is a JSON `BadgeStyleConfig` attribute that replaces individual visual slots.
 * Events: none. Lifecycle and integration: uses light DOM and retains initial child markup for
 * composition when no label is supplied, so Tailwind classes from the host application apply.
 */
@Component({
  selector: "dota-badge",
  shadow: false,
})
class BadgeComponent extends BaseElement {
  @Property({name: "classname", type: String})
  className: string = "";

  @Property({name: "color", type: String, default: "gray"})
  color: BadgeColor = "gray";

  @Property({name: "variant", type: String, default: "soft"})
  variant: BadgeVariant = "soft";

  @Property({name: "size", type: String, default: "md"})
  size: BadgeSize = "md";

  @Property({name: "rounded", type: String, default: "full"})
  rounded: BadgeRounded = "full";

  @Property({name: "label", type: String})
  label: string = "";

  @Property({name: "config", type: ObjectType})
  config: BadgeStyleConfig = {};

  content: string;

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  /**
   * Resolves each visual slot independently to keep a partial theme from erasing defaults.
   * `subtle` maps to the shared soft token unless the consumer explicitly configures it.
   * @returns Static class strings for the badge container and content.
   */
  private getStyle() {
    const color = this.color ?? "gray";
    const variant = this.variant ?? "soft";
    const sharedVariant = variant === "subtle" ? "soft" : variant;
    const size = this.size ?? "md";
    const rounded = this.rounded ?? "full";

    return {
      base: this.config?.base ?? BadgeStyle.base,
      content: this.config?.content ?? BadgeStyle.content,
      color: this.config?.color?.[color]?.[variant]
        ?? this.config?.color?.[color]?.[sharedVariant]
        ?? BadgeStyle.color[color]?.[sharedVariant]
        ?? BadgeStyle.color.gray.soft,
      size: this.config?.size?.[size] ?? BadgeStyle.size[size] ?? BadgeStyle.size.md,
      rounded: this.config?.rounded?.[rounded] ?? BadgeStyle.rounded[rounded] ?? BadgeStyle.rounded.full,
    };
  }

  render(): string {
    const style = this.getStyle();
    const content = this.label ? escapeHtml(this.label) : this.content;

    return `<span class="${escapeHtml(`${style.base} ${style.color} ${style.size} ${style.rounded} ${this.className}`)}"><span class="${escapeHtml(style.content)}">${content}</span></span>`;
  }
}

export {BadgeComponent, BadgeStyle as BadgeConfig};
export type {BadgeColor, BadgeRounded, BadgeSize, BadgeStyleConfig, BadgeVariant};
