import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult, when} from "@ayu-sh-kr/dota-wrap/rendering";
import {type MessageType} from "@dota/pages/chat.page.ts";
import {MDService} from "@dota/configs/markdown.config.ts";

@Component({
  selector: "message-card",
  shadow: false
})
export class MessageCardComponent extends BaseElement {

  @Property({
    name: 'key',
    type: String,
  })
  key!: string;

  @Property({
    type: String,
    name: "message-type"
  })
  type!: MessageType

  @Property({
    type: String,
    name: "message"
  })
  message!: string

  constructor() {
    super();
  }


  @AfterInit()
  afterViewInit() {
    const result = this.type === "USER" ? ["self-end", "w-2/3"] : ["self-start","w-full"];
    this.classList.add(...result);
  }

  /** Renders the message's Markdown; the output is trusted markup from MDService. */
  renderMarkdown(message: string): string {
    if(!message) return "";
    return MDService.renderHtml(message);
  }

  render(): TemplateResult {
    return html`
      <div class="flex items-center gap-2  self-end">
        ${when(this.type === "SERVER", html`<img src="https://icon-library.com/images/bot-icon/bot-icon-29.jpg" class="size-8 self-start" alt="server-message-dota-bot"/>`)}
        <div class="prose-sm prose-slate dark:prose-invert h-fit rounded-md p-2 break-all max-w-[92%]   ${messageStyleConfig[this.type]}">
          ${trustedHTML(this.renderMarkdown(this.message))}
        </div>
      </div>
    `
  }
}

const messageStyleConfig = {
  "USER": "bg-purple-400 dark:text-white dark:bg-purple-900 text-gray-50 ml-auto !max-w-[50%]",
  "SERVER": "bg-white dark:text-gray-300 dark:bg-slate-800 text-slate-700 w-full "
}