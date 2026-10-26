import {BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, when, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

/**
 * Centered heading block shared by every page: an eyebrow, a title, and an optional lede.
 * It uses the same type roles as the home page sections, so page openings read alike.
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

  /** Short uppercase label above the title. */
  @Property({name: "eyebrow", type: String})
  eyebrow: string = "";

  /** Title text. */
  @Property({name: "heading", type: String})
  heading: string = "";

  /** Optional supporting sentence below the title. */
  @Property({name: "description", type: String})
  description: string = "";

  /** Heading level: `1` for the page title (default), `2` for a later section. */
  @Property({name: "level", type: String})
  level: string = "1";

  constructor() {
    super();
  }

  render(): TemplateResult {
    const title = this.level === "2"
      ? html`<h2 class="type-section text-foreground">${this.heading}</h2>`
      : html`<h1 class="type-title text-foreground">${this.heading}</h1>`;

    return html`
      <div class="layout-page-head">
        ${when(this.eyebrow, html`<span class="type-eyebrow">${this.eyebrow}</span>`)}
        ${title}
        ${when(this.description, html`<p class="type-lede text-muted">${this.description}</p>`)}
      </div>
    `;
  }
}
