import {AfterInit, BaseElement, BindEvent, Component, Property, Boolean} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

@Component({
  selector: 'app-offer',
  shadow: false
})
export class OfferComponent extends BaseElement {

  @Property({
    name: 'visible',
    type: Boolean
  })
  isVisible: boolean = true;

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    const offer = LocalStorageService.get('offer');
    this.isVisible = Boolean.process(offer);
  }

  @BindEvent({event: 'click', id: '#close'})
  handleClose() {
    this.isVisible = false;
    LocalStorageService.add('offer', 'false');
  }

  render(): TemplateResult {
    return html`
        <div 
            class="${this.isVisible ? '' : 'hidden'} relative font-sans flex items-center justify-center w-full bg-gradient-to-r from-primary-subtle via-default to-primary-subtle py-4"
        >
            <div class="text-lg text-foreground gap-x-4 hover:text-opacity-90 cursor-pointer flex">Write <span class="text-primary"> Reusable </span> HTML</div>
            <span id="close" class="absolute right-10 focus:scale-95 cursor-pointer">
                    <dota-icon name="ic:twotone-close" color="gray" variant="soft" size="md"></dota-icon>
            </span>
        </div>
    `
  }

}
