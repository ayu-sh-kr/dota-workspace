import { BaseElement, Component, HostListener, Property, String } from "@ayu-sh-kr/dota-core";
import {RouterUtils} from "@ayu-sh-kr/dota-router";
import {routerService} from "@dota/main.ts";

@Component({
  selector: "doc-path",
  shadow: false,
})
export class DocPathComponent extends BaseElement {
  @Property({
    name: "file-path",
    type: String,
  })
  filePath!: string;

  constructor() {
    super();
  }

  @HostListener({ event: "click" })
  clickListener() {
    routerService.route(`/docs?content=${this.filePath}`);
  }

  render(): string {
    const includes = RouterUtils.getCurrentPath().includes(this.filePath);
    // language=html
    return `
    <div class="cursor-pointer text-sm text-[#67676c] dark:text-gray-300 py-2 px-2 transition-all hover:text-purple-500 duration-300 ease-in-out font-medium ${
      includes ? "!text-purple-600 dark:!text-purple-500" : ""
    }
       "
    >
      ${this.filePath.replace(".md", "").replace("-", " ")}
    </div>
    `;
  }
}
