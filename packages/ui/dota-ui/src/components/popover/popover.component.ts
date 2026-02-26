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
import {OnEvent} from "@ayu-sh-kr/dota-event";


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

  /** Cleanup function returned by autoUpdate — must be called on disconnect. */
  private _cleanupAutoUpdate: (() => void) | null = null

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
    // Stop any previous autoUpdate loop before (re-)initialising.
    if (this._cleanupAutoUpdate) {
      this._cleanupAutoUpdate();
      this._cleanupAutoUpdate = null;
    }

    // Locate or create the anchored element exactly once.
    if (!this.anchoredEL) {
      const existing = document.querySelector<HTMLElement>(this.anchoredSelector);
      if (existing) {
        this.anchoredEL = existing;
      } else {
        this.anchoredEL = document.createElement(this.anchoredSelector) as HTMLElement;
        this.anchoredEL.style.position = 'absolute';
        this.anchoredEL.style.display  = 'none';
        document.body.appendChild(this.anchoredEL);
      }
    }

    // Guard: floating-ui requires both elements to be in the DOM.
    if (!this.anchoredEL) return;

    this._cleanupAutoUpdate = autoUpdate(this, this.anchoredEL, () => {
      // Both elements must still be in the DOM when the callback fires.
      if (!this.isConnected || !this.anchoredEL?.isConnected) return;

      computePosition(this, this.anchoredEL!, {
        placement: this.placement,
        middleware: [offset(this.offset), flip(), shift()]
      }).then(({x, y}) => {
        if (!this.anchoredEL) return;
        Object.assign(this.anchoredEL.style, {
          left: `${x}px`,
          top:  `${y}px`,
        });
      });
    });
  }

  @OnEvent('disconnected', true)
  onDisconnected() {
    if (this._cleanupAutoUpdate) {
      this._cleanupAutoUpdate();
      this._cleanupAutoUpdate = null;
    }
    if (this.anchoredEL) {
      this.anchoredEL.remove();
      this.anchoredEL = null;
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