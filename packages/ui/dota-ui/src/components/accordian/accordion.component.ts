import {BaseElement, BindEvent, Component, Property, String} from "@ayu-sh-kr/dota-core";
import "@dota/components/icon/icons.component.ts";
import './accordion.css';
import {AccordionStyle} from "@dota/components/accordian/accordion.config.ts";
import type {AccordionColor, AccordionSize, AccordionVariant} from "@dota/components/accordian/accordion.config.ts";


/**
 * AccordionComponent represents a collapsible content panel with customizable header and description.
 * It extends BaseElement and provides functionality for an expandable/collapsible accordion interface.
 */
@Component({
    selector: 'dota-accordion',
    shadow: false
})
class AccordionComponent extends BaseElement {

    /** Additional CSS classes to be applied to the accordion container */
    @Property({name: 'classname', type: String})
    className!: string;

    /** Text content displayed in the accordion header */
    @Property({name: 'header', type: String})
    header!: string;

    /** Content displayed when the accordion is expanded */
    @Property({name: 'description', type: String})
    description!: string;

    /** Icon name to be displayed before the header text */
    @Property({name: 'icon', type: String})
    icon!: string;

    /** Color theme of the accordion */
    @Property({name: 'color', type: String})
    color!: AccordionColor;

    /** Visual style variant of the accordion */
    @Property({name: 'variant', type: String})
    variant!: AccordionVariant

    /** Size variant of the accordion */
    @Property({name: 'size', type: String})
    size!: AccordionSize

    constructor() {
        super();
    }


    /**
     * Handles the accordion expansion/collapse when the header is clicked.
     * Toggles the visibility of the description and rotates the arrow icon.
     */
    @BindEvent({event: 'click', id: '#header'})
    handleAccordion() {
        const element = this.querySelector('#description');
        if (element) {
            element.classList.toggle('description-active');
        }

        const icon = this.querySelector('#icon');

        if (icon) {
            icon.classList.toggle('active');
        }
    }

    /**
     * Processes the icon name and returns the HTML string for the icon component.
     * @param icon - The name of the icon to be displayed
     * @returns HTML string containing the icon component or empty string if no icon provided
     */
    processIcon = (icon: string) => {
        return icon ? `<dota-icon className="text-blue-400 text-xl" name="${icon}"></dota-icon>` : '';
    }


    render(): string {
        return `
            <div class="${this.className ?? ''} w-full flex flex-col">
                <button type="button" id="header" class="${AccordionStyle.button.base} ${AccordionStyle.button.size[this.size] ?? AccordionStyle.button.size.md} ${AccordionStyle.button.color[this.color][`${this.variant ?? 'solid'}`] ?? AccordionStyle.button.color.gray.soft}">
                    <div class="flex">
                        ${this.processIcon(this.icon)}
                        <span class="text-left break-all line-clamp-1">${this.header}</span>
                    </div>
                    <div id="icon" class="icon">
                        <dota-icon name="material-symbols:arrow-forward-ios-rounded"></dota-icon>
                    </div>
                </button>
                <div id="description" class="description">
                    <p class="overflow-hidden p-2 ${AccordionStyle.paragraph}">${this.description}</p>
                </div>
            </div>
        `
    }
}


export {AccordionComponent, AccordionStyle as AccordionConfig, type AccordionColor, type AccordionSize, type AccordionVariant}