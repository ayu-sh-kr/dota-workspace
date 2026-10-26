import {BaseElement, BindEvent, Boolean, Component, Emitter, EventEmitter, Property} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {OpenAIService} from "@dota/service/OpenAIService.ts";
import {MessageRecord} from "@dota/pages/chat.page.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";


@Component({
  selector: 'ai-form',
  shadow: false,
})
export class AiFormComponent extends BaseElement {

  openApiService: OpenAIService;

  @Property({
    type: Boolean,
    name: 'is-loading',
  })
  isLoading!: boolean;

  @Emitter()
  messageEvent!: EventEmitter<MessageRecord>

  constructor() {
    super();
    this.openApiService = new OpenAIService("deepseek/deepseek-r1-distill-llama-8b")
  }

  @BindEvent({event: 'submit', id: '#chat-form'})
  async userInputEvent(event: SubmitEvent) {
    this.isLoading = true;
    try {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const userMessage = formData.get('user-input')?.toString().trim() || '';

      if (userMessage) {
        const userMessageRecord: MessageRecord = {
          message: userMessage,
          type: 'USER',
        };
        this.messageEvent.emit(userMessageRecord);
        const user = Promise.resolve(LocalStorageService.pushToList('message', userMessageRecord));
        const message = await this.openApiService.chatCompletion(userMessage);
        const chatMessageRecord: MessageRecord = {
          message: message,
          type: 'SERVER',
        };
        this.messageEvent.emit(chatMessageRecord);
        const chat = Promise.resolve(LocalStorageService.pushToList('message', chatMessageRecord));
        form.reset();

        await Promise.all([chat, user])
      }
    }
    finally {
      this.isLoading = false;
    }
  }


  render(): TemplateResult {
    return html`
      <form id="chat-form" class="surface-card flex w-full items-center gap-2 p-2 focus-within:border-primary">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-foreground">
          <span class="app-header-symbol" aria-hidden="true"></span>
        </span>
        <label for="chat-input" class="sr-only">Message</label>
        <input id="chat-input" name="user-input" type="text" autocomplete="off"
               class="min-w-0 flex-1 bg-transparent px-2 py-2 text-foreground outline-none disabled:pointer-events-none disabled:opacity-70"
               placeholder="Hello! How can I assist you today?"/>
        <button type="submit" class="button-primary button-compact px-4" aria-busy="${this.isLoading ? 'true' : 'false'}">
          ${this.isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    `;
  }

}