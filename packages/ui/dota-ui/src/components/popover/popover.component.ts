import {autoUpdate, computePosition, flip, offset, shift, type Placement} from "@floating-ui/dom";
import "./popover.css"
import {
  BaseElement,
  Boolean, Number,
  Component, Property,
  String, WindowListener, AfterInit, BindEvent,
  DocumentListener,
  HostListener
} from "@ayu-sh-kr/dota-core";
import { OnEvent } from "@ayu-sh-kr/dota-event";


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
class PopoverComponent extends BaseElement {

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
    type: Number
  })
  offset!: number

  @Property({
    name: 'anchored-selector',
    type: String
  })
  anchoredSelector!: string

  anchoredEL: HTMLElement | null = null

  /**
   * Content of the trigger element
   */
  label!: string

  /**
   * Content to be displayed in the popover
   */
  content!: string

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  @OnEvent('connected', true)
  onConnected() {
    if (!this.anchoredEL) {
      this.anchoredEL = document.createElement(this.anchoredSelector) as HTMLElement
      this.anchoredEL.style.position = 'absolute'
      this.anchoredEL.style.display = 'none'
      document.body.appendChild(this.anchoredEL)
    }

    autoUpdate(this, this.anchoredEL, () => {
      computePosition(this, this.anchoredEL!, {
        placement: this.placement,
        middleware: [offset(this.offset), flip(), shift()]
      }).then(({x, y}) => {
        Object.assign(this.anchoredEL!.style, {
          left: `${x}px`,
          top: `${y}px`
        })
      })
    })
  }

  @OnEvent('disconnected', true)
  onDisconnected() {
    if (this.anchoredEL) {
      this.anchoredEL.remove()
      this.anchoredEL = null
    }
  }


  @DocumentListener({event: 'click'})
  handleClickOutside(event: MouseEvent) {
    if (!this.anchoredEL) {
      console.warn('Anchored element not found. Please ensure the "anchored-selector" property is set correctly.');
      return
    }
    const target = event.target as Node;
    if (!this.contains(target) && !this.anchoredEL.contains(target)) {
      this.anchoredEL.style.display = 'none';
    }
  }

  close() {
    if (!this.anchoredEL) {
      console.warn('Anchored element not found. Please ensure the "anchored-selector" property is set correctly.');
      return
    }
    this.anchoredEL.style.display = 'none';
  }

  @HostListener({event: 'click'})
  toggle() {
    if (!this.anchoredEL) {
      console.warn('Anchored element not found. Please ensure the "anchored-selector" property is set correctly.');
      return
    }
    const visible = this.anchoredEL.style.display !== 'none';
    if (visible) {
      this.anchoredEL.style.display = 'none';
    } else {
      this.anchoredEL.style.display = 'block';
    }
  }

  render(): string {
    return `
        ${this.content}
      `
  }

}


export {PopoverComponent}