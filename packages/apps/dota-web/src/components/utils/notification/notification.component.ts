import {
  AfterInit,
  BaseElement,
  BindEvent,
  Component,
  HostListener,
  Number as DNumber,
  Property,
  String, ApplicationEventService
} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";


@Component({
  selector: 'app-notification',
  shadow: false
})
export class NotificationComponent extends BaseElement {

  @Property({name: 'type', type: String})
  type!: string;

  @Property({name: 'duration', type: DNumber})
  duration!: number;

  @Property({name: 'message', type: String})
  message!: string;

  @Property({name: 'color', type: String})
  color!: NotificationColor

  @Property({name: 'icon', type: String})
  icon!: string

  @Property({name: 'title', type: String})
  title!: string

  private removalTimeoutId?: number;
  private isHovered: boolean = false;
  private startTime!: number;
  private remainingTime!: number;

  constructor() {
    super();
    this.remainingTime = 5000;
  }

  @AfterInit()
  afterViewInit() {
    this.remainingTime = this.duration
    this.scheduleRemoval();
  }

  private scheduleRemoval() {
    this.startTime = Date.now();
    this.removalTimeoutId = window.setTimeout(() => {
      if (!this.isHovered) {
        this.remove();
      }
    }, this.remainingTime);
  }

  @BindEvent({event: 'click', id: '#close'})
  removeNode() {
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({
        name: 'notification:removed',
        data: {
          type: this.type,
          message: this.message,
          color: this.color,
          icon: this.icon,
          title: this.title
        }
      })
    this.remove();
  }

  @HostListener({event: 'mouseenter'})
  onMouseEnter() {
    this.isHovered = true;
    if (this.removalTimeoutId) {
      clearTimeout(this.removalTimeoutId)
      this.querySelector('#timer')!.classList.add('paused-animation');
      const elapsedTime = Date.now() - this.startTime;
      this.remainingTime = this.duration - elapsedTime;
    }
  }

  @HostListener({event: 'mouseleave'})
  onMouseLeave() {
    this.isHovered = false;
    this.querySelector('#timer')!.classList.remove('paused-animation');
    this.scheduleRemoval();
  }

  render(): TemplateResult {
    const color = `${NotificationConfig.color[this.color] ?? NotificationConfig.color.none}`;
    return html`
           <div class="z-10">
                <div class="${NotificationConfig.base}">
                    <div class="flex items-center gap-x-2 px-3">
                        <span class="${color} text-lg">
                            <dota-icon name="${this.icon ?? 'material-symbols-light:notifications-active-rounded'}" size="lg" color="${this.color}" variant="ghost"></dota-icon>
                        </span>
                        <div>
                            <p class="type-meta font-semibold text-foreground">${this.title}</p>
                            <div class="type-compact text-muted">${this.message}</div>
                        </div>
                    </div>
                    <span id="close" class="focus:scale-95 font-semibold cursor-pointer px-3">
                        <dota-icon name="ic:twotone-close" color="gray" variant="ghost" size="md"></dota-icon>
                    </span>
                    <span id="timer" style="--animation-duration: ${this.remainingTime + 'ms'}" class="toast-animate ${color} py-0.5 absolute bottom-0 ${this.duration}"></span>
                </div>
           </div>
        `
  }

}


const NotificationConfig = {
  base: 'surface-card overflow-hidden relative flex items-center justify-between w-[350px] sm:w-[400px] py-3',
  duration: 5000,
  color: {
    green: 'bg-green-600',
    emerald: 'bg-emerald-600',
    cyan: 'bg-cyan-600',
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    sky: 'bg-sky-600',
    red: 'bg-red-600',
    rose: 'bg-rose-600',
    yellow: 'bg-yellow-600',
    orange: 'bg-orange-600',
    pink: 'bg-pink-600',
    gray: 'bg-gray-600',
    zinc: 'bg-zinc-600',
    brown: 'bg-brown-600',
    fuchsia: 'bg-fuchsia-600',
    amber: 'bg-amber-600',
    lime: 'bg-lime-600',
    none: 'bg-purple-600'
  }
}

type NotificationColor = keyof typeof NotificationConfig.color;

export {NotificationConfig, type NotificationColor}