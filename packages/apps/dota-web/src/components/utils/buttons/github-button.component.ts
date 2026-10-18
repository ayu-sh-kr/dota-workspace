import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";


@Component({
  selector: 'github-button',
  shadow: false
})
export class GithubButtonComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    // language=HTML
    return `
      <span id="github-button" class="active:scale-95 cursor-pointer">
        <a href="https://github.com/ayu-sh-kr" target="_blank"
           class="inline-flex size-9 items-center justify-center rounded-full text-foreground hover:bg-raised"
           aria-label="GitHub">
            <dota-icon name="mdi:github" color="none" variant="ghost" size="lg"></dota-icon>
        </a>
      </span>
    `;
  }

}
