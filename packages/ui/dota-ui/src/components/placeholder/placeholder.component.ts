import "./placeholder.css"
import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

/**
 * PlaceholderComponent creates a loading placeholder with customizable styling.
 *
 * @example
 * // Basic usage
 * <dota-placeholder></dota-placeholder>
 *
 * // With custom class
 * <dota-placeholder classname="w-64 h-12"></dota-placeholder>
 *
 * // Multiple placeholders
 * <div>
 *   <dota-placeholder classname="w-32 h-32 mb-2"></dota-placeholder>
 *   <dota-placeholder classname="w-full h-4"></dota-placeholder>
 * </div>
 */

@Component({
    selector: 'dota-placeholder',
    shadow: false
})
export class PlaceholderComponent extends BaseElement {

    /**
     * Additional CSS classes to be applied to the placeholder container.
     * Supports Tailwind CSS classes for customizing dimensions, spacing, etc.
     */
    @Property({name: 'classname', type: String})
    className!: string


    constructor() {
        super();
    }

    render(): string {
        return `
            <div class="bg-slate-400 flex justify-center items-center p-1 rounded-lg overflow-hidden ${this.className}">
                <div class="placeholder w-full h-full bg-slate-300 rounded-lg"></div>
            </div>
        `
    }
}
