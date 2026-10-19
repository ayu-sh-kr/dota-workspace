/** Attributes hydration adds to server output; they never come from a component's own markup. */
const HYDRATION_ATTRIBUTE_PREFIX = 'data-dh-';

/** Custom-element names contain a hyphen; such elements render and decorate their own content. */
function isCustomElement(element: Element): boolean {
  return element.localName.includes('-');
}

/**
 * Lists the attributes a comparison should see on an element.
 * @param element Element whose own attributes are listed.
 * @returns Attributes except hydration markers.
 */
function ownAttributes(element: Element): Attr[] {
  return Array.from(element.attributes).filter(attribute => !attribute.name.startsWith(HYDRATION_ATTRIBUTE_PREFIX));
}

/**
 * Compares one server node with the node a component's string output parses to.
 * A nested custom element must carry every attribute the output gives it, but its children
 * and any attributes it set on itself belong to that child component, so they are not compared.
 * @param server Node from the existing server-rendered DOM.
 * @param client Node parsed from the component's output.
 * @returns Whether the server node can stand in for the client node.
 */
function sameNode(server: Node, client: Node): boolean {
  if (server.nodeType !== client.nodeType) return false;
  if (client.nodeType !== Node.ELEMENT_NODE) return server.nodeValue === client.nodeValue;

  const serverElement = server as Element;
  const clientElement = client as Element;
  if (serverElement.localName !== clientElement.localName) return false;

  const clientAttributes = ownAttributes(clientElement);
  if (!clientAttributes.every(attribute => serverElement.getAttribute(attribute.name) === attribute.value)) return false;
  if (isCustomElement(clientElement)) return true;
  if (ownAttributes(serverElement).length !== clientAttributes.length) return false;

  return sameChildren(serverElement, clientElement.localName === 'template'
    ? (clientElement as HTMLTemplateElement).content
    : clientElement);
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
 * holds them as empty tags (`<app-icon name="x"></app-icon>`), while the server DOM holds them
 * rendered and marked for hydration. Replacing the root then discards the children's adopted
 * nodes and repaints content that was already correct. This walks both trees instead: the
 * component's own elements, attributes, and text must match exactly, ignoring hydration markers,
 * while nested custom elements are matched by tag and the attributes the parent gave them.
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
