import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

/**
 * ScaffoldComponent provides a basic layout wrapper for content.
 *
 * @example
 * // Basic usage
 * <app-scaffold>
 *   <div>Your content here</div>
 * </app-scaffold>
 *
 * // With custom class
 * <app-scaffold classname="bg-blue-500 p-4">
 *   <div>Styled content</div>
 * </app-scaffold>
 */

@Component({
    selector: 'app-scaffold',
    shadow: false
})
export class ScaffoldComponent extends BaseElement {

    /**
     * Additional CSS classes to be applied to the scaffold section
     */
    @Property({name: 'classname', type: String})
    className!: string;

    /**
     * Inner HTML content of the component
     */
    content!: string

    /**
     * Initializes the component and captures inner content
     */
    constructor() {
        super();
        this.content = this.innerHTML;
    }

    /**
     * Renders the component with the stored content and applied classes
     * @returns Rendered HTML string
     */
    render(): string {
        return `
             <section class="p-2 ${this.className ?? ''}">
                ${this.content}
            </section>
        `;
    }

}