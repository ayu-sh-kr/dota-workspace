import {BaseElement, Component, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {resources} from "@dota/constants/resources.ts";
import {ResourceContentComponent} from "@dota/components/resource/resource-content.component.ts";

@Component({
  selector: "resource-section",
  shadow: false
})
export class ResourceSectionComponent extends BaseElement {

  constructor() {
    super();
  }

  @WindowListener({event: "onPathChange"})
  handlePathChange(event: CustomEvent<string>) {
    const resourceContentComponent = this.querySelector<ResourceContentComponent>("resource-content");
    if (resourceContentComponent) {
      resourceContentComponent.setAttribute("resource-path", event.detail);
    }
    this.querySelectorAll("resource-path").forEach(item => {
      item.setAttribute("active", `${item.getAttribute("path") === event.detail}`);
    });
  }


  render(): TemplateResult {
    return html`
      <section class="layout-page layout-section-page">
        <section-header eyebrow="Resources"
                        heading="Get more out of Dota"
                        description="Guides to the ecosystem, design systems, UI libraries, and starter templates."></section-header>
        <div class="grid gap-[var(--layout-space-7)] md:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Resources" class="self-start border-l border-default md:sticky md:top-[var(--layout-sticky-top)]">
            ${resources.map((item, index) => html`<resource-path class="block" title="${item.title}" path="${item.path}" active="${index === 0}"></resource-path>`)}
          </nav>
          <resource-content resource-path="${resources[0].path}"></resource-content>
        </div>
      </section>
    `
  }
}