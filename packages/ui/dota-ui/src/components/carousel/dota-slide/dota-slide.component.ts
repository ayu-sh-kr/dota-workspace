import {BaseElement, Component, Object as ObjectType, Property, BeforeInit} from "@ayu-sh-kr/dota-core";
import {DotaSlideStyle} from "@dota/components/carousel/dota-slide/dota-slide.config.ts";
import type {DotaSlideStyleConfig} from "@dota/components/carousel/dota-slide/dota-slide.config.ts";

/**
 * Preserves a carousel item's initial light-DOM content for `dota-carousel` or direct use.
 *
 * Inputs: `config` is a JSON `DotaSlideStyleConfig` attribute that replaces the wrapper's
 * `container` classes. It does not alter the captured content or add carousel behavior.
 * Lifecycle and integration: captures its original light-DOM markup at construction, then
 * renders it in a full-size wrapper. `dota-carousel` reads `dota-slide` children before it
 * renders its selected slide view.
 */
@Component({
  selector: "dota-slide",
  shadow: false
})
export class DotaSlideComponent extends BaseElement {

  content: string = '';

  @Property({name: "config", type: ObjectType})
  config: DotaSlideStyleConfig = {};

  private lightDomCaptured = false;

  /** Public so the class can be registered with `customElements.define` and app component lists. */
  constructor() {
    super();
  }

  /**
   * Captures authored light DOM once, before the first render.
   * Runs on connect rather than in the constructor, where happy-dom prerendering
   * has not parsed the children yet.
   */
  @BeforeInit()
  captureLightDom() {
    if (!this.lightDomCaptured) {
      this.lightDomCaptured = true;
      this.content = this.innerHTML;
    }
  }

  render(): string {
    return `<div class="${this.config?.container ?? DotaSlideStyle.container}">${this.content}</div>`;
  }
}

export {DotaSlideStyle as DotaSlideConfig};
export type {DotaSlideStyleConfig};
