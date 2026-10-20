import {BaseElement, BindEvent, Component, Number, Property} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";


@Component({
  selector: "counter-component",
  shadow: false
})
export class CounterComponent extends BaseElement {

  @Property({
    name: "counter",
    type: Number
  })
  counter: number = 0;

  constructor() {
    super();
  }

  @BindEvent({event: 'click', id: '#increment'})
  increment() {
    this.counter = this.counter + 1;
  }

  @BindEvent({event: 'click', id: '#decrement'})
  decrement() {
    this.counter--;
  }

  render(): TemplateResult {
    return html`
      <div class="flex flex-col items-center justify-center p-8">
        <h2 class="type-card mb-4 text-foreground">Counter Component</h2>
        <div class="flex items-center gap-4">
          <button id="decrement" type="button" class="button-secondary button-compact" aria-label="Decrement">-</button>
          <p id="counter" class="type-card w-8 text-center tabular-nums">${this.counter}</p>
          <button id="increment" type="button" class="button-secondary button-compact" aria-label="Increment">+</button>
        </div>
      </div>
    `
  }

}