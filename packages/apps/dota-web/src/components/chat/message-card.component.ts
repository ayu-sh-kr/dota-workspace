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
      <div class="flex items-start gap-2">
        ${when(this.type === "SERVER", html`<span class="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-foreground" aria-label="Dota AI">
          <span class="app-header-symbol scale-75" aria-hidden="true"></span>
        </span>`)}
        <div class="h-fit max-w-[92%] break-words rounded-control px-4 py-3 ${messageStyleConfig[this.type]}">
          ${trustedHTML(this.renderMarkdown(this.message))}
        </div>
      </div>
    `
  }
}

const messageStyleConfig = {
  "USER": "type-compact ml-auto !max-w-[75%] bg-[var(--action-primary-background)] text-[var(--action-primary-foreground)]",
  "SERVER": "prose prose-sm dark:prose-invert w-full border border-default bg-surface text-foreground"
}