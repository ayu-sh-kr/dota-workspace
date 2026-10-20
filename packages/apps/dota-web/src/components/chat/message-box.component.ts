import {
  AfterInit, BaseElement,
  Component, Element,
  State, WindowListener
} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MessageRecord} from "@dota/pages/chat.page.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

@Component({
  selector: "message-box",
  shadow: false
})
export class MessageBoxComponent extends BaseElement {

  @State()
  messages: MessageRecord[] = [];

  @Element({
    selector: 'card-section',
    by: 'id'
  })
  cardSection!: HTMLElement

  constructor() {
    super()
  }

  @AfterInit()
  afterViewInit() {
    requestAnimationFrame(() => {
      this.messages = LocalStorageService.getList<MessageRecord>('message')
      this.messages.forEach((message, index) => {
        const messageCardEl = document.createElement('message-card');
        messageCardEl.setAttribute('message-type', message.type);
        messageCardEl.setAttribute('message', message.message);
        messageCardEl.setAttribute('key', index.toString());

        this.cardSection.appendChild(messageCardEl);
        this.cardSection.scrollTop = this.cardSection.scrollHeight;
      })
    })
  }

  @WindowListener({event: 'onMessageEvent'})
  handleNewMessages(event: CustomEvent<MessageRecord>) {
    this.messages.push(event.detail);
    requestAnimationFrame(() => {
        const messageCardEl = document.createElement('message-card');
        messageCardEl.setAttribute('message-type', event.detail.type);
        messageCardEl.setAttribute('message', event.detail.message);
        messageCardEl.setAttribute('key', this.messages.length.toString());

        this.cardSection.appendChild(messageCardEl);
      this.cardSection.scrollTop = this.cardSection.scrollHeight;
    });
  }

  render(): TemplateResult {
    return html`
      <section id="card-section" aria-label="Messages" class="surface-inset custom-scrollbar flex h-[55vh] w-full flex-col gap-4 overflow-y-auto p-4">
        
      </section>
    `
  }
}
