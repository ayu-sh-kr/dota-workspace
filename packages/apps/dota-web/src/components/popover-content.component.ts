import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";

@Component({
  selector: "popover-content",
  shadow: false
})
export class PopoverContentComponent extends BaseElement {

  constructor() {
    super();
  }

  @OnEvent('popover-content:disconnected')
  onDisconnected() {
    console.log('popover content disconnected');
  }

  render() {
    // language=html
    return `
      <div class="bg-gray-100 border border-gray-800 rounded-2xl px-3 py-2">
        Hello Popover!
      </div>
    `
  }
}