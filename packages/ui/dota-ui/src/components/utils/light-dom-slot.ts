import {HYDRATION_TEMPLATE_ATTRIBUTE, LIGHT_DOM_SLOT_ATTRIBUTE} from "@ayu-sh-kr/dota-core";

/**
 * Carries a light-DOM component's authored children into the template element marked
 * `data-dota-slot`.
 *
 * The original nodes are moved rather than copied through `innerHTML`, so listeners, nested
 * component state, and hydration markers that a parent template placed on them survive.
 * A host that arrives server-rendered already holds its children inside the slot element,
 * so nothing is moved and hydration adopts that markup in place; Dota SSR fills the same
 * element. The slot element must not contain template interpolations, because the renderer
 * never patches the moved children.
 */
export class LightDomSlot {
  private nodes: Node[] = [];
  private captured = false;

  /**
   * Detaches the host's authored children once, before its first render.
   * Call it from `connectedCallback()` before `super.connectedCallback()` renders, and
   * {@link restore} right after; happy-dom prerendering has not parsed the children when
   * the constructor runs.
   * @param host Component host whose current children are the authored content.
   */
  capture(host: HTMLElement): void {
    if (this.captured) return;
    this.captured = true;
    if (host.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE)) return;
    this.nodes = Array.from(host.childNodes);
    host.replaceChildren();
  }

  /**
   * Reports whether the host authored any element or non-blank text, before or after the
   * children were moved, and including content the server already placed in the slot.
   * @param host Component host whose template contains the slot element.
   */
  hasContent(host: HTMLElement): boolean {
    const nodes = this.nodes.length > 0
      ? this.nodes
      : Array.from(host.querySelector(`[${LIGHT_DOM_SLOT_ATTRIBUTE}]`)?.childNodes ?? []);
    return nodes.some(node => node.nodeType === Node.ELEMENT_NODE
      || (node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())));
  }

  /**
   * Moves the captured children into the rendered slot element. Later calls do nothing.
   * @param host Component host whose first render contains the slot element.
   */
  restore(host: HTMLElement): void {
    if (this.nodes.length === 0) return;
    host.querySelector(`[${LIGHT_DOM_SLOT_ATTRIBUTE}]`)?.append(...this.nodes);
    this.nodes = [];
  }
}
