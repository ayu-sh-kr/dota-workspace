import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { Route } from "@ayu-sh-kr/dota-wrap/router";
import {OpenAIService} from "@dota/service/OpenAIService.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/chat', mode: 'csr'})
@Component({
  selector: "chat-page",
  shadow: false,
})
export class ChatPage extends BaseElement {

  messages: MessageRecord[] = [];
  isLoading = false;


  constructor() {
    super();
    this.openApiService = new OpenAIService("deepseek/deepseek-r1-distill-llama-8b")
    this.messages = []
  }

  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
    this.messages = LocalStorageService.getList<MessageRecord>("message");
  }

  render(): TemplateResult {
    return html`
      <app-header></app-header>
      <main id="chat-main" class="layout-content layout-section-page">
        <section-header id="welcome-message" eyebrow="Dota AI" heading="Chat with Dota AI"
                        description="Turn your ideas into code with the Dota assistant."></section-header>
        <div class="flex flex-col gap-4">
          <message-box id="message-box"></message-box>
          <ai-form id="ai-form" is-loading="${this.isLoading}" class="block w-full"></ai-form>
        </div>
      </main>
      <app-footer></app-footer>
    `;
  }
}

export type MessageType = 'USER' | 'SERVER';

export interface MessageRecord {
  message: string;
  type: MessageType;
}
