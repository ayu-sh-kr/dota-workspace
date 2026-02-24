import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";


/**
 * A customizable card component that serves as a container for other card elements.
 * @example
 * // Basic card usage
 * <dota-card className="p-4 border rounded-lg shadow-md">
 *   <card-header>Card Header</card-header>
 *   <card-title>Card Title</card-title>
 *   <card-description>This is a card description</card-description>
 *   <card-footer className="mt-4">
 *     <button>Action 1</button>
 *     <button>Action 2</button>
 *   </card-footer>
 * </dota-card>
 * @property {string} className - CSS classes to be applied to the card container
 * @property {string} content - Inner HTML content of the card
 */
@Component({
    selector: 'dota-card',
    shadow: false
})
export class CardComponent extends BaseElement {

    content!: string;

    @Property({name: 'className', type: String})
    className!: string

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {
        return `
            <div class="${this.className}">
                ${this.content}
            </div>
        `;
    }

}

/**
 * Component for rendering the card's title.
 *
 * @property {string} title - The title text to be displayed
 * @property {string} className - Additional CSS classes for styling
 */
@Component({
    selector: 'card-title',
    shadow: true
})
export class CardTitleComponent extends BaseElement {

    @Property({name: 'title', type: String})
    title!: string;

    @Property({name: 'className', type: String})
    className!: string;

    constructor() {
        super();
    }

    template = (title: string) => {

        let content;

        content = title || this.innerHTML;

        return `
        <h1 class="text-3xl font-bold ${this.className ?? ''}">
                    ${content}
        </h1>
        `;
    }

    render() {
        return this.template(this.title);
    }
}

/**
 * Component for rendering the card's header section.
 *
 * @property {string} header - The header content
 */
@Component({
    selector: 'card-header',
    shadow: false
})
export class CardHeaderComponent extends BaseElement {

    @Property({name: '', type: String})
    header!: string;

    constructor() {
        super();
    }

    template = (header: string) => {
        let content = header || this.innerHTML;

        return `
            <header class="py-4 text-4xl font-bold">${content}</header>
        `
    }

    render(): string {
        return this.template(this.header)
    }
}

/**
 * Component for rendering the card's description content.
 *
 * @property {string} description - The description text
 * @property {string} className - Additional CSS classes for styling
 */
@Component({
    selector: 'card-description',
    shadow: false
})
export class CardDescriptionComponent extends BaseElement {

    @Property({name: 'description', type: String})
    description!: string;

    @Property({name: 'className', type: String})
    className!: string;

    constructor() {
        super();
    }


    template = (description: string) => {
        let content = description || this.innerHTML;

        return `
            <p class="text-lg font-medium ${this.className}">${content}</p>
        `
    }

    render(): string {
        return this.template(this.description)
    }
}

/**
 * Component for rendering the card's footer section.
 *
 * @property {string} className - Additional CSS classes for styling
 * @property {string} content - Footer content
 */
@Component({
    selector: 'card-footer',
    shadow: false
})
export class CardFooterComponent extends BaseElement {

    content!: string

    @Property({name: 'className', type: String})
    className!: string;

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {
        return `
            <footer class="flex items-center gap-4 justify-center ${this.className}">
                ${this.content}
            </footer>
        `;
    }

}