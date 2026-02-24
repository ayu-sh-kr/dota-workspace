import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

import {BadgeStyle} from "@dota/components/badge/badge.config.ts";
import type {BadgeColor, BadgeRounded, BadgeSize, BadgeVariants} from "@dota/components/badge/badge.config.ts";

/**
 * BadgeComponent
 *
 * A customizable badge component that can display text or content with various styles.
 *
 * @example
 * // Basic badge with default styling
 * <dota-badge>New</dota-badge>
 *
 * @example
 * // Customized badge with specific properties
 * <dota-badge
 *   color="blue"
 *   variant="outline"
 *   size="lg"
 *   rounded="full"
 *   label="Premium">
 * </dota-badge>
 *
 * @example
 * // Badge with custom class
 * <dota-badge classname="custom-badge" color="green">Success</dota-badge>
 *
 * @property {string} className - Additional CSS classes to apply to the badge
 * @property {BadgeColor} color - Color theme of the badge (e.g., 'red', 'blue', 'green')
 * @property {BadgeVariants} variant - Visual style variant ('solid', 'outline', etc.)
 * @property {BadgeSize} size - Size of the badge ('sm', 'md', 'lg', etc.)
 * @property {BadgeRounded} rounded - Border radius style ('none', 'sm', 'md', 'full')
 * @property {string} label - Text content to display in the badge
 */

@Component({
    selector: 'dota-badge',
    shadow: false
})
class BadgeComponent extends BaseElement {

    @Property({name: 'classname', type: String})
    className!: string

    @Property({name: 'color', type: String})
    color!: BadgeColor

    @Property({name: 'variant', type: String})
    variant!: BadgeVariants;

    @Property({name: 'size', type: String})
    size!: BadgeSize

    @Property({name: 'rounded', type: String})
    rounded!: BadgeRounded;

    @Property({name: 'label', type: String})
    label!: string;

    content!: string;

    constructor() {
        super();
        this.content = this.innerHTML;
        this.counter = 0;
    }

    render(): string {
        return `
            <span id="click" class="${BadgeStyle.base} ${BadgeStyle['color'][`${this.color ?? 'red'}`][`${this.variant ?? 'solid'}`]} ${BadgeStyle.size[`${this.size ?? ''}`]} ${BadgeStyle.rounded[`${this.rounded ?? 'none'}`]} ${this.className ?? ''}">
                ${this.label ? this.label : this.content}
            </span>
        `
    }

}

export {BadgeComponent, BadgeStyle as BadgeConfig};

