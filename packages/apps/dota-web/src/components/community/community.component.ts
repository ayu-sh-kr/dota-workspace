import { BaseElement, Component } from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { communityData, CommunityMember } from "./CommunityData";

@Component({
  selector: "community-component",
  shadow: false
})
export class CommunityComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <section class="layout-page layout-section-page">
        <section-header eyebrow="Community"
                        heading="A word from the Dota team"
                        description="The people building Dota, and why they started."></section-header>
        <div class="layout-grid-3">
          ${communityData.map(member => html`
            <community-card
              image-src="${member.imageSrc}"
              name="${member.name}"
              role="${member.role}"
              github-link="${member.githubLink || ''}"
              linkedin-link="${member.linkedinLink || ''}"
              quote="${member.quote}"
            ></community-card>
          `)}
        </div>
      </section>
`
  }
}
