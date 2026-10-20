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
      <section class="p-4 space-y-4">
        <section-header heading="Word from" highlight="Dota Team"></section-header>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
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
