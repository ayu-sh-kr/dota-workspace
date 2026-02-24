import "./popover.css"
import {
    BaseElement,
    Boolean, Number,
    Component, Property,
    String, WindowListener, AfterInit, BindEvent
} from "@ayu-sh-kr/dota-core";
import {type Placement, PositionCalculator} from "@dota/utils/position-calculator.utils.ts";


/**
 * PopoverComponent creates a customizable popup/tooltip that can be positioned relative to a trigger element.
 *
 * @example
 * // Basic usage
 * <dota-popover placement="top">
 *   <button>Click me</button>
 *   <template id="panel">
 *     Popover content here
 *   </template>
 * </dota-popover>
 *
 * // With custom placement and offset
 * <dota-popover placement="bottom" offset="10">
 *   <button>Hover me</button>
 *   <template id="panel">
 *     <div>Custom content</div>
 *   </template>
 * </dota-popover>
 */
@Component({
    selector: 'dota-popover',
    shadow: false
})
class PopoverComponent extends BaseElement{

    /**
     * Controls the visibility state of the popover
     */
    @Property({
        name: 'is-open',
        type: Boolean
    })
    isOpen!: boolean

    /**
     * Determines the placement of the popover relative to the trigger element
     * Possible values: 'top', 'bottom', 'left', 'right'
     */
    @Property({
        name: 'placement',
        type: String
    })
    placement!: Placement

    /**
     * Sets the distance between the popover and the trigger element
     */
    @Property({
        name: 'offset',
        type: String
    })
    offset!: string

    /**
     * Content of the trigger element
     */
    label!: string

    /**
     * Content to be displayed in the popover
     */
    content!: string

    /**
     * Horizontal position of the popover
     */
    @Property({
        name: 'pos-x',
        type: Number
    })
    posX!: number;

    /**
     * Vertical position of the popover
     */
    @Property({
        name: 'pos-y',
        type: Number
    })
    posY!: number;

    constructor() {
        super();
        this.extractResource()
        this.posX = 0;
        this.posY = 0;
    }

    private extractResource() {
        const template = this.querySelector('#panel') as HTMLTemplateElement;
        if (template) {
            this.content = template.innerHTML;
        }
        const firstChild = this.firstElementChild;
        if (firstChild) {
            this.label = firstChild.outerHTML;
        }
    }

    /**
     * Lifecycle hook that runs after component initialization
     * Updates the initial position of the popover
     */
    @AfterInit()
    async afterViewInit() {
        console.log('Initiated Popover')
        this.updatePosition();
    }

    /**
     * Handles click events on the trigger button
     * Toggles the popover visibility and updates its position
     */
    @BindEvent({event: 'click', id: '#button'})
    handlePopover() {
        this.isOpen = !this.isOpen;
        this.updatePosition();
    }

    /**
     * Updates the popover position on window resize or scroll
     * Calculates the new position based on the placement property
     */
    @WindowListener({event: ['resize', 'scroll']})
    updatePosition() {
        if(!this.isOpen) return;
        const button = this.querySelector('#button') as HTMLElement;
        const popper = this.querySelector('#tooltip') as HTMLElement;

        const position = new PositionCalculator()
            .reference(button)
            .target(popper)
            .offset(5)
            .placement(this.placement)
            .calculate();

        this.posY = position.top;
        this.posX = position.left;
    }

    /**
     * Handles clicks outside the popover
     * Closes the popover when clicking outside
     */
    @WindowListener({event: 'click'})
    handleWindowClick(event: Event){
        const path = event.composedPath();
        if(!path.includes(this)) {
            this.isOpen = false;
            this.status = false;
        }
    }

    render(): string {
        return `
            <button id="button" aria-describedby="tooltip">
                ${this.label}
            </button>
            <div id="tooltip" role="tooltip" class="${this.isOpen ? '' : 'hidden'}" style="top: ${this.posY}px; left: ${this.posX}px">
                ${this.content}
            </div>
        `
    }

}

type PopoverPosition = {
    top: number,
    right: number,
    bottom: number,
    left: number
}

export {PopoverComponent, type PopoverPosition}