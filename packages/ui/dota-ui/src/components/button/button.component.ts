import {BaseElement, Boolean, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {
  ButtonStyle,
  type ButtonAnimation,
  type ButtonAnimationColor,
  type ButtonColor,
  type ButtonRound,
  type ButtonSize,
  type ButtonStyleConfig,
  type ButtonType,
  type ButtonVariants,
  type IconPosition,
} from "@dota/components/button/button.config.ts";
import './button.css';

/**
 * Renders a native, themeable button with optional icon, fill effect, and busy state.
 *
 * Inputs: `label` supplies the visible label (otherwise the element's initial light-DOM
 * content is used); `icon` and `icon-position` (`"leading"` by default or `"forward"`)
 * place a registered `dota-icon` beside it. `color`, `variant`, `size`, and `round`
 * select the default visual tokens, falling back to `none`, `solid`, `md`, and `md`.
 * `animation` and `animation-color` opt into the fill treatment. `className` adds classes
 * to the native button, and `config` accepts a `ButtonStyleConfig` JSON attribute to
 * replace individual visual slots. `type` accepts `button`, `submit`, or `reset` and
 * defaults to `button`; other values safely fall back to `button`. `disabled` prevents
 * interaction, while `loading` also disables the control and exposes `aria-busy`.
 * `aria-label` provides an accessible name when the visible content is icon-only.
 *
 * Lifecycle and integration: the component uses light DOM so the consumer's Tailwind
 * output can style configured classes. Its inner control is a native `<button>`, so
 * keyboard operation, form submission, and disabled behavior are browser-native;
 * `dota-icon` must be registered by the consuming application when `icon` is used.
 */
@Component({
  selector: 'dota-button',
  shadow: false,
})
class ButtonComponent extends BaseElement {
  content!: string;

  @Property({name: 'animation', type: String})
  animation?: ButtonAnimation;

  @Property({name: 'className', type: String})
  className = '';

  @Property({name: 'label', type: String})
  label?: string;

  @Property({name: 'color', type: String})
  color?: ButtonColor;

  @Property({name: 'variant', type: String})
  variant?: ButtonVariants;

  @Property({name: 'icon', type: String})
  icon?: string;

  @Property({name: 'loading', type: Boolean})
  loading = false;

  @Property({name: 'disabled', type: Boolean})
  disabled = false;

  @Property({name: 'icon-position', type: String})
  iconPosition?: IconPosition;

  @Property({name: 'animation-color', type: String})
  animationColor?: ButtonAnimationColor;

  @Property({name: 'type', type: String})
  type?: ButtonType;

  @Property({name: 'size', type: String})
  size?: ButtonSize;

  @Property({name: 'round', type: String})
  rounded?: ButtonRound;

  @Property({name: 'aria-label', type: String})
  ariaLabel: string | null = null;

  @Property({name: 'config', type: ObjectType})
  config?: ButtonStyleConfig;

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  private getStyle() {
    const override = this.config;
    const color = this.color && this.color in ButtonStyle.color ? this.color : 'none';
    const variant = this.variant && this.variant in ButtonStyle.color[color] ? this.variant : 'solid';
    const size = this.size && this.size in ButtonStyle.size ? this.size : 'md';
    const round = this.rounded && this.rounded in ButtonStyle.rounded ? this.rounded : 'md';
    const animation = this.animation && this.animation in ButtonStyle.animation ? this.animation : undefined;
    const animationColor = this.animationColor && this.animationColor in ButtonStyle.animation.fill.color
      ? this.animationColor
      : 'indigo';

    return {
      base: override?.base ?? ButtonStyle.base,
      label: override?.label ?? ButtonStyle.label,
      icon: override?.icon ?? ButtonStyle.icon,
      loadingIndicator: override?.loadingIndicator ?? ButtonStyle.loadingIndicator,
      size: override?.size?.[size] ?? ButtonStyle.size[size],
      rounded: override?.rounded?.[round] ?? ButtonStyle.rounded[round],
      color: override?.color?.[color]?.[variant] ?? ButtonStyle.color[color]?.[variant] ?? ButtonStyle.color.none.solid,
      animation: animation
        ? {
            base: override?.animation?.[animation]?.base ?? ButtonStyle.animation[animation].base,
            color: override?.animation?.[animation]?.color?.[animationColor]
              ?? ButtonStyle.animation[animation].color[animationColor],
          }
        : undefined,
    };
  }

  private getButtonType(): ButtonType {
    return this.type === 'submit' || this.type === 'reset' ? this.type : 'button';
  }

  private renderIcon(style: ReturnType<ButtonComponent['getStyle']>): string {
    return this.icon
      ? `<dota-icon class="${style.icon}" name="${this.icon}" size="${this.size ?? 'md'}"></dota-icon>`
      : '';
  }

  private renderLoadingIndicator(style: ReturnType<ButtonComponent['getStyle']>): string {
    return this.loading
      ? `<svg class="${style.loadingIndicator}" viewBox="0 0 24 24" aria-hidden="true" fill="none"><circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3"></circle><path class="opacity-90" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z"></path></svg>`
      : '';
  }

  render(): string {
    const style = this.getStyle();
    const isDisabled = this.disabled || this.loading;
    const icon = this.renderIcon(style);
    const label = this.label || this.content;
    const content = this.iconPosition === 'forward'
      ? `<span class="${style.label}">${label}</span>${icon}`
      : `${icon}<span class="${style.label}">${label}</span>`;
    const ariaLabel = this.ariaLabel ? ` aria-label="${this.ariaLabel}"` : '';
    const animation = style.animation ? ` ${style.animation.base} ${style.animation.color}` : '';

    return `
      <button type="${this.getButtonType()}" class="${style.base} ${style.color} ${style.size} ${style.rounded}${animation} ${this.className ?? ''}"${ariaLabel} aria-busy="${this.loading}" ${isDisabled ? 'disabled' : ''}>
        ${this.renderLoadingIndicator(style)}
        ${content}
      </button>
    `;
  }
}

export {ButtonComponent, ButtonStyle as ButtonConfig};
export type {
  ButtonAnimation,
  ButtonAnimationColor,
  ButtonColor,
  ButtonRound,
  ButtonSize,
  ButtonStyleConfig,
  ButtonType,
  ButtonVariants,
  IconPosition,
};
