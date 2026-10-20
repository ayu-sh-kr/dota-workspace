import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

/**
 * Centered page-section heading whose last words are set in the accent color.
 *
 * Text arrives through attributes rather than authored children, so the server and
 * browser render the same template and hydration adopts the heading in place.
 *
 * Selector: `section-header`.
 */
@Component({
  selector: "section-header",
  shadow: false
})
export class SectionHeaderComponent extends BaseElement {

  /** Leading heading text, rendered in the foreground color. */
  @Property({name: "heading", type: String})
  heading: string = "";

  /** Trailing heading text, rendered in the accent color. */
  @Property({name: "highlight", type: String})
  highlight: string = "";

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <h1 class="text-3xl sm:text-4xl font-extrabold font-adaptive text-center mb-20">
        ${this.heading} <span class="text-purple-600 dark:text-purple-500">${this.highlight}</span>
      </h1>
    `;
  }
}
