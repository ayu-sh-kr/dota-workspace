import {autoUpdate, computePosition, flip, offset, shift, type Placement} from "@floating-ui/dom";
import "./popover.css";
import {
  BaseElement,
  Component,
  DocumentListener,
  HostListener,
  LifecycleEventConstants,
  Number,
  Property,
  String,
  WindowListener,
} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";

const INTERACTIVE_SELECTOR = "a[href], button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex='-1'])";
const CUSTOM_ELEMENT_NAME = /^[a-z][.0-9_a-z]*-[.0-9_a-z-]*$/;
const PLACEMENTS = new Set<Placement>([
  "top", "top-start", "top-end", "right", "right-start", "right-end",
  "bottom", "bottom-start", "bottom-end", "left", "left-start", "left-end",
]);

/**
 * Positions a consumer-owned panel next to a light-DOM trigger or a position-only anchor.
 *
 * Inputs: `anchored-selector` (`anchored-selector`, default `""`) identifies an
 * existing panel, or names a custom element such as `color-picker` for the component
 * to create and own. Existing panels remain consumer-owned and are never removed.
 * `placement` (`placement`, default `"bottom"`) selects a supported Floating UI placement,
 * falling back to `"bottom"`; `offset` (`offset`, default `8`) sets its pixel separation.
 * Events: clicking a non-empty trigger toggles the panel; outside clicks and Escape close it,
 * with Escape returning focus to the trigger. An empty host is a position-only anchor and
 * leaves panel visibility to its consumer. No custom events emit.
 * Lifecycle and integration: light DOM preserves trigger markup and lets consumer Tailwind
 * classes apply. Connected and reactive attribute changes resolve the panel and start
 * Floating UI auto-updates; disconnect stops that work and removes only a panel it created.
 */
@Component({
  selector: "dota-popover",
  shadow: false,
})
class PopoverComponent extends BaseElement {
  @Property({name: "placement", type: String, default: "bottom"})
  placement: Placement = "bottom";

  @Property({name: "offset", type: Number, default: 8})
  offset = 8;

  @Property({name: "anchored-selector", type: String, default: ""})
  anchoredSelector = "";

  private panel: HTMLElement | null = null;
  private createdPanel: HTMLElement | null = null;
  private trigger: HTMLElement | null = null;
  private cleanupAutoUpdate: (() => void) | null = null;
  private isOpen = false;
  private isPositionOnly = false;
  private panelId = "";
  private content: string;

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  @OnEvent(LifecycleEventConstants.CONNECTED, true)
  onConnected() {
    this.initializePopover();
  }

  @OnEvent(LifecycleEventConstants.ATTRIBUTE_CHANGED, true)
  onAttributeChanged(_event: ApplicationEvent) {
    this.initializePopover();
  }

  disconnectedCallback() {
    this.stopAutoUpdate();
    this.removeCreatedPanel();
    this.panel = null;
    this.trigger = null;
    this.isOpen = false;
    super.disconnectedCallback();
  }

  /**
   * Resolves the external panel and rebinds its positioner after connection or an
   * observed input change. Replacing the auto-update cleanup first avoids duplicate
   * observers when framework-driven attribute updates rerender the light DOM.
   */
  private initializePopover() {
    this.stopAutoUpdate();
    this.panel = this.resolvePanel();
    this.isPositionOnly = !this.content.trim();

    if (!this.panel) return;

    if (!this.isPositionOnly) {
      this.setupTrigger();
      this.setOpen(false);
    }

    this.cleanupAutoUpdate = autoUpdate(this, this.panel, () => this.updatePosition());
  }

  /**
   * Finds a panel selected by the consumer or creates one for a valid custom-element name.
   * The explicit name-only creation path preserves the legacy picker contract without
   * allowing arbitrary selector strings to become unexpected document nodes.
   * @returns The selected or created panel, or `null` when the selector is unavailable.
   */
  private resolvePanel(): HTMLElement | null {
    if (!this.anchoredSelector) return null;

    try {
      if (this.createdPanel && !this.createdPanel.matches(this.anchoredSelector)) {
        this.removeCreatedPanel();
      }

      const existing = document.querySelector<HTMLElement>(this.anchoredSelector);
      if (existing) return existing;

      if (!CUSTOM_ELEMENT_NAME.test(this.anchoredSelector)) return null;

      const panel = document.createElement(this.anchoredSelector);
      panel.style.position = "absolute";
      panel.style.display = "none";
      document.body.appendChild(panel);
      this.createdPanel = panel;
      return panel;
    } catch {
      console.warn(`[dota-popover] Invalid anchored-selector: "${this.anchoredSelector}".`);
      return null;
    }
  }

  /** Removes only the panel created for a custom-element selector, never a consumer-owned target. */
  private removeCreatedPanel() {
    this.createdPanel?.remove();
    this.createdPanel = null;
  }

  /**
   * Makes the authored interactive child, or the host when none exists, express the
   * popover relationship. This preserves native control semantics while giving icon-only
   * triggers keyboard access and an instance-specific `aria-controls` reference.
   */
  private setupTrigger() {
    if (!this.panel) return;

    const interactiveChild = this.querySelector<HTMLElement>(INTERACTIVE_SELECTOR);
    this.trigger = interactiveChild ?? this;
    if (!interactiveChild) {
      this.trigger.setAttribute("role", "button");
      this.trigger.tabIndex = 0;
    }

    if (!this.panel.id) {
      this.panelId = `dota-popover-panel-${this.__uid}`;
      this.panel.id = this.panelId;
    } else {
      this.panelId = this.panel.id;
    }
    this.trigger.setAttribute("aria-controls", this.panelId);
    this.trigger.setAttribute("aria-expanded", "false");
  }

  /** Stops the active Floating UI observer before a panel changes or the host disconnects. */
  private stopAutoUpdate() {
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = null;
  }

  /** Positions the panel only while both component-owned reference and external panel remain connected. */
  private updatePosition() {
    if (!this.panel || !this.isConnected || !this.panel.isConnected) return;

    void computePosition(this, this.panel, {
      placement: PLACEMENTS.has(this.placement) ? this.placement : "bottom",
      middleware: [offset(this.offset), flip(), shift()],
    }).then(({x, y}) => {
      if (!this.panel || !this.panel.isConnected) return;
      Object.assign(this.panel.style, {left: `${x}px`, top: `${y}px`});
    });
  }

  /**
   * Synchronizes visual visibility with the trigger's ARIA state without changing
   * a position-only anchor's externally managed panel. Closing by Escape restores
   * focus through the optional argument after the state has been updated.
   * @param restoreFocus Whether to return keyboard focus to the active trigger.
   */
  close(restoreFocus = false) {
    this.setOpen(false);
    if (restoreFocus) this.trigger?.focus();
  }

  private setOpen(open: boolean) {
    if (!this.panel || this.isPositionOnly) return;

    this.isOpen = open;
    this.panel.style.display = open ? "block" : "none";
    this.panel.setAttribute("aria-hidden", `${!open}`);
    this.trigger?.setAttribute("aria-expanded", `${open}`);
    if (open) this.updatePosition();
  }

  @DocumentListener({event: "click"})
  handleClickOutside(event: MouseEvent) {
    if (!this.isOpen || !this.panel) return;

    const path = event.composedPath();
    if (!path.includes(this) && !path.includes(this.panel)) this.close();
  }

  @WindowListener({event: "keydown"})
  handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.isOpen) this.close(true);
  }

  @HostListener({event: "click"})
  toggle() {
    if (!this.isPositionOnly) this.setOpen(!this.isOpen);
  }

  @HostListener({event: "keydown"})
  handleTriggerKeydown(event: KeyboardEvent) {
    if (this.isPositionOnly || this.trigger !== this || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    this.setOpen(!this.isOpen);
  }

  render(): string {
    return this.content;
  }
}

export {PopoverComponent};
