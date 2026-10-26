import { BaseElement, Component, Emitter, EventEmitter, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "resource-path",
  shadow: false
})
export class ResourcePathComponent extends BaseElement {

  @Property({
    name:"title",
    type:String
  })
  title!:string

  @Property({
    name:"path",
    type:String
  })
  path!:string

  /** `true` while this resource is the one shown. */
  @Property({
    name:"active",
    type:String
  })
  active: string = "false"

  @Emitter()
  pathChange!: EventEmitter<string>

  constructor() {
    super();
  }

  @HostListener({event:"click"})
  hostClickListener() {
    this.pathChange.emit(this.path);
  }

  render(): TemplateResult {
    return html`
      <button type="button" aria-current="${this.active === 'true' ? 'page' : 'false'}"
              class="-ml-px block w-full border-l-2 py-2 pl-4 text-left font-medium transition-colors
                     ${this.active === 'true'
                       ? 'border-primary text-primary'
                       : 'border-transparent text-muted hover:border-strong hover:text-foreground'}">
        ${this.title}
      </button>
`
  }
}