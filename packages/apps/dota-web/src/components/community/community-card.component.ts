// community-card.component.ts
import { BaseElement, Component, Property, String } from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult, when} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "community-card",
  shadow: false,
})
export class CommunityCardComponent extends BaseElement {
  @Property({ name: 'image-src', type: String }) imageSrc: string = "";
  @Property({ name: 'name', type: String }) name: string = "";
  @Property({ name: 'role', type: String }) role: string = "";
  @Property({ name: 'github-link', type: String }) githubLink: string = "";
  @Property({ name: 'linkedin-link', type: String }) linkedinLink: string = "";
  @Property({ name: 'quote', type: String }) quote: string = "";

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <article class="community-card surface-card flex h-full flex-col gap-5">
        <header class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <d-avatar img="${this.imageSrc}" img-alt="${this.name}" is-chip="true" color="slate" variant="solid" size="xl"></d-avatar>
            <div>
              <h2 class="font-semibold text-foreground">${this.name}</h2>
              <p class="type-meta text-muted">${this.role}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            ${when(this.githubLink, html`<a target="_blank" rel="noopener" href="${this.githubLink}" class="button-icon button-compact" title="GitHub" aria-label="${this.name} on GitHub">
              <dota-icon name="mdi:github" color="slate" variant="ghost" size="md"></dota-icon>
            </a>`)}
            ${when(this.linkedinLink, html`<a target="_blank" rel="noopener" href="${this.linkedinLink}" class="button-icon button-compact" title="LinkedIn" aria-label="${this.name} on LinkedIn">
              <dota-icon name="mdi:linkedin" color="slate" variant="ghost" size="md"></dota-icon>
            </a>`)}
          </div>
        </header>
        <blockquote class="type-compact text-muted">&ldquo;${this.quote}&rdquo;</blockquote>
      </article>
    `;
  }
}
