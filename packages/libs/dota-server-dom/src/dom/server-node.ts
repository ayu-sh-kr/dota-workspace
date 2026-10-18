/** DOM `nodeType` values, as `Node.ELEMENT_NODE` and friends. */
export const NODE_TYPE = {
  element: 1,
  text: 3,
  comment: 8,
  document: 9,
  documentFragment: 11
} as const;

/** What `append()`-style methods accept: a node, or a string that becomes a text node. */
export type ServerNodeInput = ServerNode | string;

/**
 * Base of every server DOM object. Shared component code calls `Node` APIs on the
 * server, so they must work, but nothing here is serialized: a component's HTML comes
 * only from `render()`. The tree is just a parent link and ordered children; events come
 * from the platform `EventTarget` and never bubble. Members behave as in the DOM unless noted.
 */
export class ServerNode extends EventTarget {
  #parent: ServerNode | null = null;
  readonly #children: ServerNode[] = [];

  get nodeType(): number {
    return 0;
  }

  get nodeName(): string {
    return '';
  }

  /** Always false, which keeps `BaseElement.connectedCallback` wiring off the server. */
  get isConnected(): boolean {
    return false;
  }

  /** The current request's document (read from the `document` global), so nodes never outlive their request's. */
  get ownerDocument(): Document | null {
    return (globalThis as {document?: Document}).document ?? null;
  }

  get parentNode(): ServerNode | null {
    return this.#parent;
  }

  get parentElement(): ServerNode | null {
    return this.#parent?.nodeType === NODE_TYPE.element ? this.#parent : null;
  }

  /** A copy; changing the array does not change the tree. */
  get childNodes(): readonly ServerNode[] {
    return [...this.#children];
  }

  get firstChild(): ServerNode | null {
    return this.#children[0] ?? null;
  }

  get lastChild(): ServerNode | null {
    return this.#children.at(-1) ?? null;
  }

  get nextSibling(): ServerNode | null {
    const siblings = this.#parent ? this.#parent.#children : [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  get previousSibling(): ServerNode | null {
    const siblings = this.#parent ? this.#parent.#children : [];
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }

  get textContent(): string {
    return this.#children.filter((child) => child.nodeType !== NODE_TYPE.comment).map((child) => child.textContent).join('');
  }

  set textContent(value: string | null) {
    this.replaceChildren(...(value ? [value] : []));
  }

  hasChildNodes(): boolean {
    return this.#children.length > 0;
  }

  appendChild<T extends ServerNode>(node: T): T {
    return this.insertBefore(node, null);
  }

  /**
   * The one tree mutation everything else uses. The node leaves its old parent first; a
   * fragment contributes its children instead of itself.
   * @param reference Child to insert before, or null to append.
   * @throws DOMException when the insert would create a cycle or `reference` is not a child.
   */
  insertBefore<T extends ServerNode>(node: T, reference: ServerNode | null): T {
    if (node instanceof ServerDocumentFragment) {
      node.childNodes.forEach((child) => this.insertBefore(child, reference));
      return node;
    }
    if (node.contains(this)) throw new DOMException('The new child contains the parent', 'HierarchyRequestError');
    if (reference && reference.#parent !== this) throw new DOMException('The reference is not a child of this node', 'NotFoundError');
    node.remove();
    const position = reference ? this.#children.indexOf(reference) : this.#children.length;
    this.#children.splice(position, 0, node);
    node.#parent = this;
    return node;
  }

  removeChild<T extends ServerNode>(node: T): T {
    if (node.#parent !== this) throw new DOMException('The node is not a child of this node', 'NotFoundError');
    node.remove();
    return node;
  }

  remove(): void {
    const parent = this.#parent;
    if (!parent) return;
    parent.#children.splice(parent.#children.indexOf(this), 1);
    this.#parent = null;
  }

  append(...nodes: ServerNodeInput[]): void {
    nodes.forEach((node) => this.appendChild(toServerNode(node)));
  }

  prepend(...nodes: ServerNodeInput[]): void {
    const first = this.firstChild;
    nodes.forEach((node) => this.insertBefore(toServerNode(node), first));
  }

  replaceChildren(...nodes: ServerNodeInput[]): void {
    [...this.#children].forEach((child) => child.remove());
    this.append(...nodes);
  }

  contains(node: ServerNode | null): boolean {
    for (let current = node; current; current = current.#parent) {
      if (current === this) return true;
    }
    return false;
  }

  getRootNode(): ServerNode {
    let root: ServerNode = this;
    while (root.#parent) root = root.#parent;
    return root;
  }
}

/** The DOM's `Text` or `Comment`, from `createTextNode`/`createComment` or strings given to `append()`. */
export class ServerCharacterData extends ServerNode {
  constructor(private readonly kind: 'text' | 'comment', public data: string) {
    super();
  }

  get nodeType(): number {
    return this.kind === 'text' ? NODE_TYPE.text : NODE_TYPE.comment;
  }

  get nodeName(): string {
    return this.kind === 'text' ? '#text' : '#comment';
  }

  get textContent(): string {
    return this.data;
  }

  set textContent(value: string | null) {
    this.data = value ?? '';
  }

  get length(): number {
    return this.data.length;
  }
}

/** Result of `createDocumentFragment()`; inserting it moves its children and leaves it empty. */
export class ServerDocumentFragment extends ServerNode {
  get nodeType(): number {
    return NODE_TYPE.documentFragment;
  }

  get nodeName(): string {
    return '#document-fragment';
  }
}

function toServerNode(node: ServerNodeInput): ServerNode {
  return typeof node === 'string' ? new ServerCharacterData('text', node) : node;
}
