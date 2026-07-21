import {BaseElement, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {ScaffoldStyle} from "@dota/components/utils/scaffold.config.ts";
import type {ScaffoldStyleConfig} from "@dota/components/utils/scaffold.config.ts";

/**
 * Provides a neutral light-DOM layout wrapper for consumer-composed content.
 *
 * Inputs: `classname` (`classname`, default `""`) adds instance-specific
 * classes to the wrapper. `config` (`config`, default `{}`) accepts a JSON
 * `ScaffoldStyleConfig` attribute that replaces the default container class.
 * Events: none. Lifecycle and integration: initial child markup is retained
 * and rendered in light DOM, so consumers own its semantics and Tailwind styles.
 */
@Component({
    selector: 'app-scaffold',
    shadow: false
})
export class ScaffoldComponent extends BaseElement {

    @Property({name: 'classname', type: String})
    className = '';

    @Property({name: 'config', type: ObjectType})
    config: ScaffoldStyleConfig = {};

    private content: string;

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    /**
     * Resolves the wrapper class with a nullish fallback so an empty configured
     * value can intentionally remove the library's default spacing.
     * @returns The static container class for the current instance.
     */
    private getStyle() {
        return this.config?.container ?? ScaffoldStyle.container;
    }

    render(): string {
        return `
             <div class="${this.getStyle()} ${this.className}">
                ${this.content}
            </div>
        `;
    }

}

export {ScaffoldStyle};
export type {ScaffoldStyleConfig};
