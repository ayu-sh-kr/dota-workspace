import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";
import type {ChipColor, ChipPosition} from "@dota/components/chip/chip.config.ts";
import {ChipStyle} from "@dota/components/chip/chip.config.ts";

/**
 * ChipComponent - A custom web component for displaying a chip with optional text and positioning.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <dota-chip text="New" position="top-right" color="yellow">
 *   <div>Content goes here</div>
 * </dota-chip>
 *
 * <!-- Without text -->
 * <dota-chip position="top-left" color="red">
 *   <span>Some content</span>
 * </dota-chip>
 * ```
 *
 * @property {string} text - Optional text to display in the chip
 * @property {ChipPosition} position - Position of the chip relative to its container ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @property {ChipColor} color - Color theme of the chip ('yellow', 'red', 'green', 'blue')
 */


@Component({
    selector: 'dota-chip',
    shadow: false
})
class ChipComponent extends BaseElement{

    @Property({name: 'text', type: String})
    text!: string;

    @Property({name: 'position', type: String})
    position!: ChipPosition;

    @Property({name: 'color', type: String})
    color!: ChipColor

    content!: string

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {
        return `
            <div class="${ChipStyle.base.parent}">
                <span class="
                            ${ChipStyle.base.chip} ${ChipStyle.position[this.position] ?? ChipStyle.position["top-right"]} 
                            ${ChipStyle.color[this.color] ?? ChipStyle.color.yellow} text-[10px]  
                            ${this.text ? 'size-4': 'size-2'}">
                    ${this.text ?? ''}
                </span>
                ${this.content}
            </div>
        `;
    }

}

export {ChipComponent, ChipStyle, type ChipColor, type ChipPosition}

