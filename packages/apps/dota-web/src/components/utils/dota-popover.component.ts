import {AfterInit, BaseElement, Component, HostListener, LifecycleEventConstants, Property, String} from "@ayu-sh-kr/dota-core";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import {autoUpdate, computePosition, flip, offset, shift} from "@floating-ui/dom";

@Component({
  selector: "dota-popover",
  shadow: false
})
export class DotaPopover extends BaseElement {

  content!: string

  @Property({
    name: "popover-selector",
    type: String
  })
  popoverSelector!: string

  private _popoverElement!: HTMLElement

  constructor() {
    super();
    this.content = this.innerHTML
  }

  @OnEvent(LifecycleEventConstants.CONNECTED)
  onConnected() {
    console.log('connected popover');
    // Guard: remove stale element first
    if (this._popoverElement) {
      this._popoverElement.remove();
    }

    this._popoverElement = document.createElement(this.popoverSelector);
    document.body.appendChild(this._popoverElement);
    this._popoverElement.style.position = 'absolute';
    this._popoverElement.style.display = 'none';

    autoUpdate(this, this._popoverElement, () => {
      computePosition(this, this._popoverElement, {
        placement: 'bottom',
        middleware: [offset(15), flip(), shift()]
      }).then(({x, y}) => {
        this._popoverElement.style.left = `${x}px`;
        this._popoverElement.style.top = `${y}px`;
      });
    });
  }

  @OnEvent(LifecycleEventConstants.DISCONNECTED)
  onDisconnected() {
    console.log('disconnected popover');
  }

  @HostListener({event: 'click'})
  toggle() {
    console.log('toggle popover');
    const visible = this._popoverElement.style.display !== 'none';
    this._popoverElement.style.display = visible ? 'none' : 'block';
  }

  render() {
    // language=html
    return `${this.content}`
  }
}