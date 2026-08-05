import { BaseElement, Component, HostListener, Property, String } from "@ayu-sh-kr/dota-wrap/core";
import { RouterUtils } from "@ayu-sh-kr/dota-wrap/router";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { routerService } from "@dota/main.ts";

/**
 * DocPathComponent — a single navigation item in the doc sidebar.
 *
 * Displays the file name (without extension, hyphens replaced by spaces).
 * Highlights when the current URL contains the file path.
 *
 * On click:
 *   1. Routes to /docs?content=<file>
 *   2. Dispatches 'doc:nav' so the mobile sidebar drawer closes itself.
 */
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
  onClick() {
    if (!this.filePath) return;
    routerService.route(`/docs?content=${this.filePath}`);
    window.dispatchEvent(new CustomEvent("doc:nav"));
  }

  private get isActive(): boolean {
    const path = this.filePath ?? '';
    return path.length > 0 && RouterUtils.getCurrentPath().includes(path);
  }

  private get label(): string {
    return (this.filePath ?? '')
      .replace('.md', '')
      .replace(/-/g, ' ');
  }

  render(): TemplateResult {
    const active = this.isActive;

    const base = `
            w-full flex items-center gap-2 rounded-md
            px-3 py-2 text-sm font-medium
            cursor-pointer select-none
            transition-colors duration-150
        `;

    const idle =
      "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-gray-800/60";
    const activeC =
      "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 font-semibold";

    return html`
            <div class="${base} ${active ? activeC : idle}">
                <span class="w-1.5 h-1.5 rounded-full shrink-0
                             ${active ? 'bg-purple-500 dark:bg-purple-400' : ''}"></span>
                <span class="capitalize">${this.label}</span>
            </div>
        `;
  }
}
