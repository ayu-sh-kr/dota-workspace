import {LIGHT_DOM_SLOT_ATTRIBUTE} from './hydration-markers';

/** Attributes hydration adds to server output; they never come from a component's own markup. */
const HYDRATION_ATTRIBUTE_PREFIX = 'data-dh-';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

/**
 * Custom-element names contain a hyphen; such elements render and decorate their own content.
 * SVG and MathML also define hyphenated names (`font-face`, `annotation-xml`), so only HTML
 * elements count.
 */
function isCustomElement(element: Element): boolean {
  return element.namespaceURI === HTML_NAMESPACE && element.localName.includes('-');
}

/**
 * Lists the attributes a comparison should see on an element.
 * @param element Element whose own attributes are listed.
 * @returns Attributes except hydration markers.
 */
function ownAttributes(element: Element): Attr[] {
  return Array.from(element.attributes).filter(attribute => !attribute.name.startsWith(HYDRATION_ATTRIBUTE_PREFIX));
}

/** A `<template>` keeps its children in an inert fragment, on both sides of the comparison. */
function childrenOf(element: Element): Node {
  return (element as HTMLTemplateElement).content ?? element;
}

/** Whether a parent gave a nested component any element, comment, or non-blank text. */
function hasAuthoredContent(element: Element): boolean {
  return Array.from(element.childNodes).some(node => node.nodeType !== Node.TEXT_NODE || node.nodeValue?.trim());
}

/**
 * Finds where a rendered nested component keeps the children its parent authored.
 * A shadow host leaves them in its light DOM. A light-DOM component moves them into the
 * `data-dota-slot` element of its own template, which is not one belonging to a deeper
 * component. Without either, the component's output replaced them and they cannot be checked.
 * @param host Server-rendered nested component.
 * @returns The node holding the authored children, or `null` when they are gone.
 */
function authoredChildrenOf(host: Element): Node | null {
  if (host.shadowRoot) return host;
  for (const slot of Array.from(host.querySelectorAll(`[${LIGHT_DOM_SLOT_ATTRIBUTE}]`))) {
    let owner = slot.parentElement;
    while (owner && !isCustomElement(owner)) owner = owner.parentElement;
    if (owner === host) return slot;
  }
  return null;
}

/**
 * Compares one server node with the node a component's string output parses to.
 * A nested custom element must carry every attribute the output gives it, and the children
 * the output gives it must be where that component keeps them. Its rendered content and any
 * attributes it set on itself belong to that child component, so they are not compared.
 * @param server Node from the existing server-rendered DOM.
 * @param client Node parsed from the component's output.
 * @returns Whether the server node can stand in for the client node.
 */
function sameNode(server: Node, client: Node): boolean {
  if (server.nodeType !== client.nodeType) return false;
  if (client.nodeType !== Node.ELEMENT_NODE) return server.nodeValue === client.nodeValue;

  const serverElement = server as Element;
  const clientElement = client as Element;
  if (serverElement.localName !== clientElement.localName || serverElement.namespaceURI !== clientElement.namespaceURI) return false;

  const clientAttributes = ownAttributes(clientElement);
  if (!clientAttributes.every(attribute => serverElement.getAttribute(attribute.name) === attribute.value)) return false;
  if (isCustomElement(clientElement)) {
    if (!hasAuthoredContent(clientElement)) return true;
    const authored = authoredChildrenOf(serverElement);
    return authored !== null && sameChildren(authored, clientElement);
  }
  if (ownAttributes(serverElement).length !== clientAttributes.length) return false;

  return sameChildren(childrenOf(serverElement), childrenOf(clientElement));
}

/**
 * Compares two child lists pairwise.
 * @param server Parent of the server-rendered nodes.
 * @param client Parent of the parsed output nodes.
 * @returns Whether every child matches in order.
 */
function sameChildren(server: Node, client: Node): boolean {
  const serverChildren = server.childNodes;
  const clientChildren = client.childNodes;
  if (serverChildren.length !== clientChildren.length) return false;
  for (let index = 0; index < clientChildren.length; index += 1) {
    if (!sameNode(serverChildren[index], clientChildren[index])) return false;
  }
  return true;
}

/**
 * Reports whether server-rendered light DOM already represents a component's string output.
 *
 * Exact `innerHTML` equality fails for any component that renders other components: its output
 * holds them as bare tags (`<app-icon name="x"></app-icon>`), while the server DOM holds them
 * rendered and marked for hydration. Replacing the root then discards the children's adopted
 * nodes and repaints content that was already correct. This walks both trees instead: the
 * component's own elements, attributes, and text must match exactly, ignoring hydration markers,
 * while nested custom elements are matched by tag, the attributes the parent gave them, and the
 * children the parent gave them.
 * @param root Existing root holding server-rendered nodes.
 * @param markup The component's string output.
 * @returns Whether the existing nodes can be kept.
 */
export function matchesServerMarkup(root: ParentNode & Node, markup: string): boolean {
  const document = root.ownerDocument ?? (root as unknown as Document);
  const template = document.createElement('template');
  template.innerHTML = markup;
  return sameChildren(root, template.content);
}
