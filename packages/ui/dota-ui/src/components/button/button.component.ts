import {BaseElement, Component, Property, String, Boolean} from "@ayu-sh-kr/dota-core";
import {
    type ButtonAnimation, type ButtonAnimationColor,
    type ButtonRound, type ButtonSize,
    ButtonStyle, type ButtonVariants, type IconPosition
} from "@dota/components/button/button.config.ts";
import './button.css'
import {type UIColor} from "@dota/configs/app.config.ts";


/**
 * ButtonComponent - A customizable button component for web applications.
 *
 * @example
 * // Basic usage
 * <dota-button>Click me</dota-button>
 *
 * @example
 * // With properties
 * <dota-button
 *   label="Submit"
 *   variant="solid"
 *   color="primary"
 *   size="lg"
 *   icon="check"
 *   icon-position="leading"
 *   animation="fill"
 *   animation-color="indigo"
 *   round="full"
 * ></dota-button>
 */
@Component({
    selector: 'dota-button',
    shadow: false
})
class ButtonComponent extends BaseElement {
    /** Inner content of the button */
    content!: string;

    /** Button animation type */
    @Property({name: 'animation', type: String})
    animation!: ButtonAnimation

    /** Additional CSS classes */
    @Property({name: 'className', type: String})
    className!: string

    /** Button label text */
    @Property({name: "label", type: String})
    label!: string;

    /** Button color theme */
    @Property({name: 'color', type: String})
    color!: UIColor

    /** Button style variant */
    @Property({name: "variant", type: String})
    variant!: ButtonVariants;

    /** Icon name to display */
    @Property({name: "icon", type: String})
    icon!: string;

    /** Loading state of the button */
    @Property({name: 'loading', type: Boolean})
    loading!: boolean

    /** Position of the icon relative to label */
    @Property({name: 'icon-position', type: String})
    iconPosition!: IconPosition

    /** Color of the button animation */
    @Property({name: 'animation-color', type: String})
    animationColor!: ButtonAnimationColor;

    /** HTML button type attribute */
    @Property({name: 'type', type: String})
    type!: string;

    /** Button size variant */
    @Property({name: 'size', type: String})
    size!: ButtonSize

    /** Button border radius style */
    @Property({name: 'round', type: String})
    rounded!: ButtonRound

    constructor() {
        super();
        this.content = this.innerHTML;

    }


    template = (): string => {

        const iconComponent = this.icon ? `<dota-icon class="relative block" name="${this.icon}" size="${this.size || 'md'}"></dota-icon>` : '';
        const size = ButtonStyle.size?.[this.size ?? "md"] ?? '';
        const round = ButtonStyle.rounded?.[this.rounded] ?? '';

        let content: string;
        switch (this.iconPosition) {
            case "forward": {
                content = `
                    <p>${this.label || this.content}</p>
                   ${iconComponent}
                `
                break
            }

            case "leading": {
                content = `
                    ${iconComponent}
                    <p>${this.label || this.content}</p>
                `
                break
            }

            default: {
                content = `
                    ${iconComponent}
                    <p>${this.label || this.content}</p>
                `
            }
        }

        if(this.animation) {
            return `
                <button class="${ButtonStyle.base} ${ButtonStyle.animation[this.animation || 'fill'].base} ${size} ${round}
                               ${ButtonStyle.animation[this.animation ?? 'fill'].color[this.animationColor ?? 'indigo']}
                               
                ">
                    ${this.label || this.content}
                </button>
            `
        }

        const color = ButtonStyle.color?.[this.color ?? 'none']?.[this.variant ?? 'solid'] ?? '';
        return `
            <button class="${ButtonStyle.base} ${color} ${size} ${round}">
                ${content}
            </button>
        `
    }

    render(): string {
        return this.template();
    }

}

export {ButtonComponent, ButtonStyle as ButtonConfig}
export type {ButtonVariants, ButtonRound, ButtonAnimation, ButtonSize, ButtonAnimationColor, IconPosition}
