import "./modal.css";
import {
  BaseElement,
  Boolean,
  Component,
  Emitter,
  EventEmitter,
  HostListener,
  Object as ObjectType,
  Property,
  String,
} from "@ayu-sh-kr/dota-core";
import {LifecycleEventConstants} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";
import {ModalStyle} from "@dota/components/modal/modal.config.ts";
import type {ModalDirection, ModalDuration, ModalRounded, ModalStyleConfig} from "@dota/components/modal/modal.config.ts";

/**
 * Displays consumer-provided content in a modal native dialog.
 *
 * Inputs: `open` (`open`, default `false`) accepts the explicit strings `"true"`
 * or `"false"` and synchronizes the native dialog. `classname` (`classname`,
 * default `""`) adds panel classes. `rounded` (`"none"`), `duration` (`"1300"`),
 * and `direction` (`"up"`) select safe animation tokens. `aria-label` defaults
 * to `"Dialog"`; `config` accepts a JSON `ModalStyleConfig` visual override.
 * Events: backdrop clicks, Escape/cancel, the close button, and `close()` set
 * `open` to false and emit `modalChange` with `false`; native close events keep
 * the attribute synchronized. No theme can alter these dialog semantics.
 * Lifecycle and integration: light DOM preserves the initial content inside a
 * native `<dialog>`, which supplies modal focus handling and a document backdrop.
 */
@Component({
  selector: "dota-modal",
  shadow: false,
})
class ModalComponent extends BaseElement {
  @Property({name: "open", type: Boolean, default: false})
  isOpen = false;

  @Property({name: "classname", type: String})
  className = "";

  @Property({name: "rounded", type: String, default: "none"})
  rounded: ModalRounded = "none";

  @Property({name: "duration", type: String, default: "1300"})
  duration: ModalDuration = "1300";

  @Property({name: "direction", type: String, default: "up"})
  direction: ModalDirection = "up";

  @Property({name: "aria-label", type: String, default: "Dialog"})
  ariaLabel = "Dialog";

  @Property({name: "config", type: ObjectType})
  config: ModalStyleConfig = {};

  @Emitter()
  modalChange!: EventEmitter<boolean>;

  private readonly content: string;

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  @OnEvent(LifecycleEventConstants.CONNECTED, true)
  onConnected() {
    this.syncDialog();
  }

  @OnEvent(LifecycleEventConstants.ATTRIBUTE_CHANGED, true)
  onAttributeChanged(_event: ApplicationEvent) {
    this.syncDialog();
  }

  /**
   * Synchronizes the rendered native dialog after framework lifecycle rendering.
   * Native `cancel` and `close` callbacks update the public attribute so dismissal
   * from Escape or browser APIs cannot leave the component's visible state stale.
   */
  private syncDialog() {
    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (!dialog) return;

    dialog.oncancel = event => {
      event.preventDefault();
      this.close();
    };
    dialog.onclose = () => {
      if (this.isOpen) this.close();
    };

    if (this.isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!this.isOpen && dialog.open) {
      dialog.close();
    }
  }

  /**
   * Closes the dialog through the reactive attribute and exposes the resulting
   * state through `modalChange`. Keeping this path shared prevents Escape, backdrop,
   * button, and programmatic dismissals from diverging.
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.modalChange.emit(false, this);
  }

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dialog = this.querySelector<HTMLDialogElement>("dialog");
    if (target === dialog || target.closest("[data-modal-close]")) this.close();
  }

  private getStyle() {
    const rounded = this.rounded in ModalStyle.rounded ? this.rounded : "none";

    return {
      overlay: this.config?.overlay ?? ModalStyle.overlay,
      panel: this.config?.panel ?? ModalStyle.panel,
      closeButton: this.config?.closeButton ?? ModalStyle.closeButton,
      rounded: this.config?.rounded?.[rounded] ?? ModalStyle.rounded[rounded],
    };
  }

  private getAnimationStyle() {
    const direction = this.direction in ModalStyle.direction ? this.direction : "up";
    const duration = this.duration in ModalStyle.duration ? this.duration : "1300";
    const motion = ModalStyle.direction[direction];

    return `--dota-modal-start-x: ${motion.startX}; --dota-modal-start-y: ${motion.startY}; --dota-modal-duration: ${ModalStyle.duration[duration]};`;
  }

  render() {
    const style = this.getStyle();

    return `
      <dialog class="${style.overlay}" aria-label="${this.ariaLabel}">
        <section class="${style.panel} ${style.rounded} ${this.className}" style="${this.getAnimationStyle()}">
          <button type="button" data-modal-close aria-label="Close dialog" class="${style.closeButton}">
            <span aria-hidden="true">×</span>
          </button>
          ${this.content}
        </section>
      </dialog>
    `;
  }
}

export {ModalComponent, ModalStyle as ModalConfig};
export type {ModalDirection, ModalDuration, ModalRounded, ModalStyleConfig};
