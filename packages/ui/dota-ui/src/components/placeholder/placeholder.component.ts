import "./placeholder.css"
import {BaseElement, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {PlaceholderStyle} from "@dota/components/placeholder/placeholder.config.ts";
import type {PlaceholderStyleConfig} from "@dota/components/placeholder/placeholder.config.ts";

/**
 * Renders a decorative textured surface while content is loading.
 *
 * Inputs: `classname` (`classname`, default `""`) adds layout classes to the
 * outer loading surface. `config` (`config`, default `{}`) accepts a JSON
 * `PlaceholderStyleConfig` attribute that replaces the container or inner
 * surface class slot independently; omitted slots retain `PlaceholderStyle`.
 * Events: none. Lifecycle and integration: the component uses light DOM, keeps
 * its loading surface hidden from assistive technology, and relies on static
 * Tailwind class strings so the library build emits its default styling.
 */
@Component({
    selector: 'dota-placeholder',
    shadow: false
})
export class PlaceholderComponent extends BaseElement {

    @Property({name: 'classname', type: String})
    className = '';

    @Property({name: 'config', type: ObjectType})
    config: PlaceholderStyleConfig = {};

    constructor() {
        super();
    }

    /**
     * Resolves each loading-surface slot separately so partial visual themes
     * preserve the library defaults. Nullish fallback also permits an explicit
     * empty class string when a consumer owns a slot completely.
     * @returns Static container and inner-surface class strings for this instance.
     */
    private getStyle() {
        return {
            container: this.config?.container ?? PlaceholderStyle.container,
            content: this.config?.content ?? PlaceholderStyle.content,
        };
    }

    render(): string {
        const style = this.getStyle();

        return `
            <div class="${style.container} ${this.className}" aria-hidden="true">
                <div class="${style.content}"></div>
            </div>
        `
    }
}

export {PlaceholderStyle};
export type {PlaceholderStyleConfig};
