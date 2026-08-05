import {diff} from './diff';
import {
  isConditionalValue,
  isKeyedValue,
  isTemplateResult,
  valueMarkerFor,
  valueMarkerPattern,
  valueText
} from './template';
import {
  CommitResult,
  KeyedTemplate,
  RenderInstance,
  RenderKey,
  RenderOutput,
  TemplateResult,
  nothing
} from './types';

const COMPONENT_START_MARKER = '<!--dota-component-start-->';
const COMPONENT_END_MARKER = '<!--dota-component-end-->';
const COMPONENT_ATTRIBUTE = 'data-dota-component';
const NODE_INDEX_ATTRIBUTE = 'data-dota-index';
const DYNAMIC_ATTRIBUTE = 'data-dota-dynamic';
const SOURCE_BINDING_NAME_PATTERN = /([@?.][^\s"'<>/=]+)\s*=\s*["']?$/;

/** Browser-owned component boundary accepted by render(); both variants support complete DOM replacement. */
type NativeRenderRoot = Element | ShadowRoot;

/** Output handled by the compatibility strategy when no structured template metadata exists. */
type LegacyRenderOutput = string | typeof nothing;

/**
 * Internal mutation boundary shared by full component roots and child ranges.
 * Rendering strategies depend on this contract so they can commit output without
 * knowing whether they own an Element, ShadowRoot, or bounded section of siblings.
 */
interface RenderRoot {
  /**
   * Replaces only the nodes owned by this boundary with parsed structured output.
   * @param fragment Detached nodes whose ownership transfers to this root.
   */
  replaceChildren(fragment: DocumentFragment): void;
  /**
   * Commits legacy markup within this boundary using browser HTML parsing.
   * @param value Complete trusted legacy render string.
   */
  writeHTML(value: string): void;
}

/**
 * Tracks one child interpolation after parser tokens become invisible text boundaries.
 * A part owns exactly one active representation: plain text, a conditional session,
 * or keyed ranges; TemplateStrategy coordinates transitions between those states.
 */
type ChildPart = {
  /** Selects child-range handling from the RenderPart union. */
  kind: 'child';
  /** Interpolation position used to retrieve the current template value. */
  index: number;
  /** First invisible boundary delimiting nodes owned by this interpolation. */
  start: Text;
  /** Final invisible boundary used as the insertion point for owned nodes. */
  end: Text;
  /** Plain text node currently owned by the range, when rendering a scalar value. */
  text?: Text;
  /** Nested renderer currently responsible for a selected conditional branch. */
  branch?: RenderSession;
  /** Mounted list ranges retained by application key for reconciliation. */
  keyed?: Map<RenderKey, KeyedRange>;
};

/**
 * Selects browser mutation semantics encoded by source syntax: ordinary attributes,
 * `?` presence toggles, `.` properties, or `@` event listeners.
 */
type AttributeMode = 'attribute' | 'boolean' | 'property' | 'event';

/** Maps structured binding prefixes to their browser mutation policy. */
const ATTRIBUTE_MODE_BY_PREFIX: Readonly<Record<string, AttributeMode>> = {
  '?': 'boolean',
  '.': 'property',
  '@': 'event'
};

/**
 * Retains parsed ownership for one dynamic attribute, property, or event binding.
 * The same record can be registered under several indexes so a multi-value ordinary
 * attribute is reconstructed once when any contributing interpolation changes.
 */
type AttributePart = {
  /** Selects attribute-position handling from the RenderPart union. */
  kind: 'attribute';
  /** Interpolation positions contributing to the complete binding value. */
  valueIndexes: number[];
  /** Parsed element receiving attribute, property, or listener mutations. */
  element: Element;
  /** Browser operation selected from ordinary, boolean, property, and event syntax. */
  mode: AttributeMode;
  /** Target name with source casing preserved for properties and custom events. */
  name: string;
  /** Tokenized parsed value used to reconstruct multi-interpolation attributes. */
  templateValue: string;
  /** Currently registered listener, retained so replacement and disposal can remove it. */
  listener?: EventListenerOrEventListenerObject;
};

/**
 * Runtime mutation target discovered from structured template tokens.
 * TemplateStrategy discriminates this union before applying child or binding policy.
 */
type RenderPart = ChildPart | AttributePart;

/**
 * Owns the sibling boundaries and nested renderer associated with one stable list key.
 * Keyed reconciliation moves this inclusive range while the session preserves its DOM.
 */
type KeyedRange = {
  /** First node moved or removed for the keyed entry. */
  start: Text;
  /** Last node moved or removed for the keyed entry. */
  end: Text;
  /** Renderer that patches the template associated with the retained key. */
  instance: RenderSession;
};

/** Strategy contract selected by RenderSession from the current output kind. */
interface RenderStrategy {
  /** Last committed output used as the next diff baseline. */
  readonly output: RenderOutput;
  /**
   * Commits a next output already classified by the owning RenderSession.
   * @param output Next output to compare with the strategy baseline.
   * @returns Observable mutation summary for the commit.
   */
  update(output: RenderOutput): CommitResult;
  /** Releases strategy-owned listeners and nested renderer resources. */
  dispose(): void;
}

/** ParentNode extension used when the browser supports state-preserving atomic moves. */
type AtomicMoveParent = Node & {
  /**
   * Moves an existing child without disconnecting it when the browser implements the API.
   * @param node Existing direct child to move.
   * @param before Reference child, or null to append.
   */
  moveBefore?: (node: Node, before: Node | null) => void;
};

/** Adapts an Element or ShadowRoot to the mutation operations used by strategies. */
class NativeRoot implements RenderRoot {
  /** @param root Component-owned browser root receiving complete render commits. */
  constructor(private readonly root: NativeRenderRoot) {}

  /**
   * Replaces the complete native root with detached structured output.
   * @param fragment Parsed nodes ready to connect.
   */
  replaceChildren(fragment: DocumentFragment): void {
    this.root.replaceChildren(fragment);
  }

  /**
   * Preserves legacy rendering semantics by assigning the complete HTML string.
   * @param value Trusted legacy markup produced by the component.
   */
  writeHTML(value: string): void {
    this.root.innerHTML = value;
  }
}

/** Limits nested rendering mutations to siblings between two invisible text boundaries. */
class RangeRoot implements RenderRoot {
  /**
   * @param start Boundary immediately before nodes owned by the nested renderer.
   * @param end Boundary used as the insertion point after all owned nodes.
   */
  constructor(private readonly start: Text, private readonly end: Text) {}

  /**
   * Replaces only this range, preserving its boundaries and surrounding parent DOM.
   * @param fragment Parsed nodes owned by the nested renderer.
   */
  replaceChildren(fragment: DocumentFragment): void {
    this.clear();
    this.end.parentNode?.insertBefore(fragment, this.end);
  }

  /**
   * Parses legacy nested output inertly before committing it inside the range.
   * @param value Trusted legacy markup owned by the nested renderer.
   */
  writeHTML(value: string): void {
    const template = document.createElement('template');
    template.innerHTML = value;
    this.replaceChildren(template.content);
  }

  /** Removes every owned sibling while retaining stable start and end boundaries. */
  clear(): void {
    let node = this.start.nextSibling;
    while (node && node !== this.end) {
      const next = node.nextSibling;
      node.remove();
      node = next;
    }
  }
}

/** Preserves the exact legacy string-rendering behavior used by existing clients. */
class StringStrategy implements RenderStrategy {
  /** Last committed legacy value used for exact-equality no-op detection. */
  public output: LegacyRenderOutput;

  /**
   * Commits initial string output through the same innerHTML behavior used before
   * structured rendering existed; `nothing` intentionally creates an empty root.
   * @param root Mutation boundary owned by this strategy.
   * @param output Initial legacy output.
   */
  constructor(private readonly root: RenderRoot, output: LegacyRenderOutput) {
    this.output = output;
    root.writeHTML(typeof output === 'string' ? output : '');
  }

  /**
   * Avoids DOM work for an equal legacy value and replaces the boundary otherwise.
   * Exact equality is the only safe optimization because strings carry no part metadata.
   * @param output Next output already classified as legacy by RenderSession.
   * @returns A no-op or complete replacement summary.
   */
  update(output: RenderOutput): CommitResult {
    if (isTemplateResult(output)) return {kind: 'replace', changedParts: 0, replacedNodes: 1};
    if (this.output === output) return {kind: 'noop', changedParts: 0, replacedNodes: 0};
    this.root.writeHTML(typeof output === 'string' ? output : '');
    this.output = output;
    return {kind: 'replace', changedParts: 0, replacedNodes: 1};
  }

  /** Legacy output owns no listeners or nested sessions requiring disposal. */
  dispose(): void {}
}

/** Allows one public renderer instance to change strategy without changing its identity. */
class RenderSession implements RenderInstance {
  /** Active implementation selected from the most recently committed output kind. */
  private strategy: RenderStrategy;

  /** Exposes the active strategy's last committed output as the public diff baseline. */
  get output(): RenderOutput {
    return this.strategy.output;
  }

  /**
   * Selects and mounts the strategy required by the initial output kind.
   * @param root Native or bounded root whose ownership remains stable for this session.
   * @param output Initial legacy or structured output.
   */
  constructor(private readonly root: RenderRoot, output: RenderOutput) {
    this.strategy = isTemplateResult(output)
      ? new TemplateStrategy(root, output)
      : new StringStrategy(root, output);
  }

  /**
   * Delegates compatible updates and replaces the strategy when output kind changes.
   * Keeping the session identity stable lets Core migrate components between legacy
   * strings and templates without replacing its stored RenderInstance reference.
   * @param output Next component output.
   * @returns Mutation summary produced by the active or replacement strategy.
   */
  update(output: RenderOutput): CommitResult {
    const needsTemplate = isTemplateResult(output);
    const hasTemplate = this.strategy instanceof TemplateStrategy;
    if (needsTemplate === hasTemplate) return this.strategy.update(output);

    this.strategy.dispose();
    this.strategy = needsTemplate
      ? new TemplateStrategy(this.root, output as TemplateResult)
      : new StringStrategy(this.root, output as LegacyRenderOutput);
    return {kind: 'replace', changedParts: 0, replacedNodes: 1};
  }

  /** Releases listeners and nested ranges owned by the currently active strategy. */
  dispose(): void {
    this.strategy.dispose();
  }
}

/** Owns parsed template parts and applies compatible value updates in place. */
class TemplateStrategy implements RenderStrategy {
  /** Runtime mutation targets grouped by the values that can schedule them. */
  private partsByIndex = new Map<number, RenderPart[]>();
  /** Listener-bearing parts requiring explicit cleanup before replacement or disposal. */
  private eventParts = new Set<AttributePart>();

  /** Last committed structured output used by diff() as the patch baseline. */
  public output: TemplateResult;

  /**
   * Parses and commits the first structured template while its nodes are detached.
   * @param root Mutation boundary receiving this template's owned nodes.
   * @param output Initial structured output and value set.
   */
  constructor(private readonly root: RenderRoot, output: TemplateResult) {
    this.output = output;
    this.mount(output);
  }

  /**
   * Applies compatible value changes through retained parts and remounts changed structure.
   * Disposal precedes remounting so stale event listeners and nested sessions cannot survive.
   * @param output Next output supplied by the owning RenderSession.
   * @returns No-op, part patch, or structural replacement summary.
   */
  update(output: RenderOutput): CommitResult {
    if (!isTemplateResult(output)) return {kind: 'replace', changedParts: 0, replacedNodes: 1};

    const result = diff(this.output, output);
    if (result.kind === 'noop') return {kind: 'noop', changedParts: 0, replacedNodes: 0};
    if (result.kind === 'replace') {
      this.disposeParts();
      this.mount(output);
      this.output = output;
      return {kind: 'replace', changedParts: 0, replacedNodes: 1};
    }

    this.applyIndexes(result.changedParts.map(({index}) => index), output.values);
    this.output = output;
    return {kind: 'patch', changedParts: result.changedParts.length, replacedNodes: 0};
  }

  /** Releases renderer-owned listeners and nested sessions without clearing committed DOM. */
  dispose(): void {
    this.disposeParts();
  }

  /**
   * Converts parser tokens into runtime parts before the fragment connects.
   * Child and attribute discovery stay separate because they mutate different DOM
   * representations but register into the same interpolation-indexed map.
   * @param fragment Detached parsed template fragment.
   * @param sourceBindingNames Original case-sensitive property and event names by index.
   * @returns Runtime parts grouped by every interpolation index that can update them.
   */
  private findParts(fragment: DocumentFragment, sourceBindingNames: ReadonlyMap<number, string>): Map<number, RenderPart[]> {
    const parts = new Map<number, RenderPart[]>();
    this.findChildParts(fragment, parts);
    this.indexElementsAndFindAttributeParts(fragment, sourceBindingNames, parts);
    return parts;
  }

  /**
   * Replaces child parser tokens with invisible range boundaries.
   * Text nodes are collected before mutation so replacing one node cannot disturb
   * the TreeWalker and cause later dynamic children to be skipped.
   * @param fragment Detached fragment containing parser tokens.
   * @param parts Shared registry receiving one ChildPart per token index.
   */
  private findChildParts(fragment: DocumentFragment, parts: Map<number, RenderPart[]>): void {
    const textNodes: Text[] = [];
    const textWalker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = textWalker.nextNode())) textNodes.push(textNode as Text);

    for (const text of textNodes) {
      const matches = [...text.data.matchAll(valueMarkerPattern)];
      if (matches.length === 0) continue;

      const replacement = document.createDocumentFragment();
      let cursor = 0;
      for (const match of matches) {
        const matchIndex = match.index ?? 0;
        replacement.append(text.data.slice(cursor, matchIndex));
        const start = document.createTextNode('');
        const end = document.createTextNode('');
        replacement.append(start, end);
        const index = Number(match[1]);
        text.parentElement?.setAttribute(DYNAMIC_ATTRIBUTE, '');
        recordRenderPart(parts, index, {kind: 'child', index, start, end});
        cursor = matchIndex + match[0].length;
      }
      replacement.append(text.data.slice(cursor));
      text.replaceWith(replacement);
    }
  }

  /**
   * Marks each element and records parsed attribute, property, boolean, and event parts.
   * Source names restore casing lost by HTML parsing, while special bindings reject
   * composite values because their browser mutation has one unambiguous target value.
   * @param fragment Detached fragment whose elements receive renderer metadata.
   * @param sourceBindingNames Original special-binding names by interpolation index.
   * @param parts Shared registry receiving each part under all contributing indexes.
   * @throws Error when a special binding is not one standalone interpolation.
   */
  private indexElementsAndFindAttributeParts(fragment: DocumentFragment, sourceBindingNames: ReadonlyMap<number, string>, parts: Map<number, RenderPart[]>): void {
    const elements = [...fragment.querySelectorAll('*')];
    elements.forEach((element, index) => {
      element.setAttribute(NODE_INDEX_ATTRIBUTE, String(index));
      if (element.localName.includes('-')) element.setAttribute(COMPONENT_ATTRIBUTE, element.localName);

      for (const attribute of [...element.attributes]) {
        const matches = [...attribute.value.matchAll(valueMarkerPattern)];
        if (matches.length === 0) continue;

        const valueIndexes = matches.map((match) => Number(match[1]));
        const mode = ATTRIBUTE_MODE_BY_PREFIX[attribute.name[0]] ?? 'attribute';
        const sourceName = sourceBindingNames.get(valueIndexes[0]) ?? attribute.name;
        const name = mode === 'attribute' ? attribute.name : sourceName.slice(1);
        if (mode !== 'attribute' && (valueIndexes.length !== 1 || attribute.value !== valueMarkerFor(valueIndexes[0]))) {
          throw new Error(`Dynamic ${mode} binding ${attribute.name} must be a standalone interpolation`);
        }

        const part: AttributePart = {
          kind: 'attribute',
          valueIndexes,
          element,
          mode,
          name,
          templateValue: attribute.value
        };
        if (mode === 'event') this.eventParts.add(part);
        if (mode !== 'attribute') element.removeAttribute(attribute.name);
        element.setAttribute(DYNAMIC_ATTRIBUTE, '');
        valueIndexes.forEach((valueIndex) => recordRenderPart(parts, valueIndex, part));
      }
    });
  }

  /**
   * Applies every affected runtime part once even when several changed indexes share it.
   * Deduplication is required for composite attributes and avoids listener churn when
   * more than one contributing interpolation changes in the same render.
   * @param valueIndexes Changed or initially mounted interpolation positions.
   * @param values Complete next value set used to reconstruct shared parts.
   */
  private applyIndexes(valueIndexes: readonly number[], values: readonly unknown[]): void {
    const pendingParts = new Set<RenderPart>();
    valueIndexes.forEach((index) => this.partsByIndex.get(index)?.forEach((part) => pendingParts.add(part)));

    for (const part of pendingParts) {
      if (part.kind === 'child') this.applyChild(part, values[part.index]);
      else this.applyAttribute(part, values);
    }
  }

  /**
   * Commits one parsed binding using the semantics selected by its source prefix.
   * Ordinary composite attributes use all next values; event updates remove the old
   * listener before registering its replacement so disposal always has one owner.
   * @param part Attribute-position metadata discovered during mount.
   * @param values Complete next value set for single or composite reconstruction.
   * @throws TypeError when an event value is neither removable nor a valid listener.
   */
  private applyAttribute(part: AttributePart, values: readonly unknown[]): void {
    const value = values[part.valueIndexes[0]];
    if (part.mode === 'boolean') {
      part.element.toggleAttribute(part.name, value !== nothing && Boolean(value));
      return;
    }
    if (part.mode === 'property') {
      (part.element as unknown as Record<string, unknown>)[part.name] = value === nothing ? undefined : value;
      return;
    }
    if (part.mode === 'event') {
      if (part.listener) part.element.removeEventListener(part.name, part.listener);
      part.listener = undefined;
      if (typeof value === 'function' || (typeof value === 'object' && value !== null && 'handleEvent' in value)) {
        part.listener = value as EventListenerOrEventListenerObject;
        part.element.addEventListener(part.name, part.listener);
      } else if (value !== nothing && value !== null && value !== undefined && value !== false) {
        throw new TypeError(`Event binding @${part.name} requires a listener, false, null, undefined, or nothing`);
      }
      return;
    }

    const isSingleValue = part.valueIndexes.length === 1 &&
      part.templateValue === valueMarkerFor(part.valueIndexes[0]);
    if (isSingleValue && (value === nothing || value === null || value === undefined || value === false)) {
      part.element.removeAttribute(part.name);
      return;
    }
    const nextValue = part.templateValue.replace(valueMarkerPattern, (_, markerIndex: string) =>
      valueText(values[Number(markerIndex)]));
    part.element.setAttribute(part.name, nextValue);
  }

  /**
   * Transitions one child range between scalar text, a conditional branch, and keyed output.
   * Previous nested ownership is disposed and cleared before another representation takes
   * over, preventing detached listeners or stale nodes from surviving a value-kind change.
   * @param part Child range receiving the next representation.
   * @param value Dynamic value selected for the part's interpolation index.
   */
  private applyChild(part: ChildPart, value: unknown): void {
    if (isConditionalValue(value)) {
      this.clearKeyed(part);
      part.text?.remove();
      part.text = undefined;
      if (value.value === nothing) {
        this.clearBranch(part);
      } else if (part.branch) {
        part.branch.update(value.value);
      } else {
        part.branch = new RenderSession(new RangeRoot(part.start, part.end), value.value);
      }
      return;
    }
    if (isKeyedValue(value)) {
      this.clearBranch(part);
      part.text?.remove();
      part.text = undefined;
      this.applyKeyed(part, value.entries);
      return;
    }

    this.clearBranch(part);
    this.clearKeyed(part);
    const text = valueText(value);
    if (!part.text) {
      part.text = document.createTextNode(text);
      part.end.parentNode?.insertBefore(part.text, part.end);
    } else {
      part.text.data = text;
    }
  }

  /**
   * Disposes and removes the selected conditional branch before another child mode takes over.
   * @param part Child range currently capable of owning a nested branch session.
   */
  private clearBranch(part: ChildPart): void {
    if (!part.branch) return;
    part.branch.dispose();
    part.branch = undefined;
    new RangeRoot(part.start, part.end).clear();
  }

  /**
   * Reconciles ordered templates by stable key while preserving retained renderer sessions.
   * Duplicate validation runs before mutation; removed keys are disposed, new keys mount,
   * and retained inclusive ranges move into next order without recreating their nodes.
   * @param part Child range that owns the complete keyed list.
   * @param entries Ordered keyed templates produced for the current render.
   * @throws Error when two entries use the same key.
   */
  private applyKeyed(part: ChildPart, entries: readonly KeyedTemplate[]): void {
    const nextKeys = new Set<RenderKey>();
    for (const entry of entries) {
      if (nextKeys.has(entry.key)) throw new Error(`Duplicate render key: ${String(entry.key)}`);
      nextKeys.add(entry.key);
    }

    const rangesByKey = part.keyed ?? new Map<RenderKey, KeyedRange>();
    for (const [key, range] of rangesByKey) {
      if (nextKeys.has(key)) continue;
      range.instance.dispose();
      removeInclusiveRange(range.start, range.end);
      rangesByKey.delete(key);
    }

    for (const entry of entries) {
      const retainedRange = rangesByKey.get(entry.key);
      if (retainedRange) {
        retainedRange.instance.update(entry.value);
        continue;
      }
      const start = document.createTextNode('');
      const end = document.createTextNode('');
      part.end.parentNode?.insertBefore(start, part.end);
      part.end.parentNode?.insertBefore(end, part.end);
      rangesByKey.set(entry.key, {start, end, instance: new RenderSession(new RangeRoot(start, end), entry.value)});
    }

    let cursor: Node = part.end;
    for (let index = entries.length - 1; index >= 0; index--) {
      const range = rangesByKey.get(entries[index].key);
      if (!range) continue;
      moveInclusiveRange(range.start, range.end, cursor);
      cursor = range.start;
    }
    part.keyed = rangesByKey;
  }

  /**
   * Releases and removes every keyed entry currently owned by a child part.
   * @param part Child range leaving keyed mode or being disposed.
   */
  private clearKeyed(part: ChildPart): void {
    if (!part.keyed) return;
    for (const range of part.keyed.values()) {
      range.instance.dispose();
      removeInclusiveRange(range.start, range.end);
    }
    part.keyed = undefined;
  }

  /**
   * Releases event listeners and nested renderer sessions before remount or disposal.
   * Parts can appear under several indexes, so child records are deduplicated before
   * cascading disposal and the registries are cleared only after their resources release.
   */
  private disposeParts(): void {
    for (const part of this.eventParts) {
      if (part.listener) part.element.removeEventListener(part.name, part.listener);
    }
    this.eventParts.clear();
    const childParts = new Set<ChildPart>();
    for (const indexedParts of this.partsByIndex.values()) {
      indexedParts.forEach((part) => {
        if (part.kind === 'child') childParts.add(part);
      });
    }
    for (const part of childParts) {
      part.branch?.dispose();
      this.clearKeyed(part);
    }
    this.partsByIndex.clear();
  }

  /**
   * Parses static structure, discovers parts, applies initial values, and commits once.
   * Initial values are written while detached so custom elements connect with final
   * attributes instead of temporary parser tokens or incomplete property state.
   * @param output Structured template whose static strings define the mounted shape.
   */
  private mount(output: TemplateResult): void {
    const template = document.createElement('template');
    const source = [COMPONENT_START_MARKER];
    const sourceBindingNames = new Map<number, string>();
    output.strings.forEach((staticSegment, index) => {
      source.push(staticSegment);
      if (index >= output.strings.length - 1) return;
      const bindingName = SOURCE_BINDING_NAME_PATTERN.exec(staticSegment)?.[1];
      if (bindingName) sourceBindingNames.set(index, bindingName);
      source.push(valueMarkerFor(index));
    });
    source.push(COMPONENT_END_MARKER);
    template.innerHTML = source.join('');
    const fragment = template.content;
    this.partsByIndex = this.findParts(fragment, sourceBindingNames);
    this.applyIndexes(output.values.map((_, index) => index), output.values);
    this.root.replaceChildren(fragment);
  }
}

/**
 * Registers one runtime part under an interpolation index.
 * Shared attribute parts call this for every contributing index so any one changed
 * value can schedule reconstruction of the complete browser binding.
 * @param parts Part registry owned by the current TemplateStrategy.
 * @param index Interpolation position that can affect the part.
 * @param part Runtime part to append at that position.
 */
function recordRenderPart(parts: Map<number, RenderPart[]>, index: number, part: RenderPart): void {
  const indexedParts = parts.get(index);
  if (indexedParts) indexedParts.push(part);
  else parts.set(index, [part]);
}

/**
 * Removes a keyed entry including both invisible range boundaries.
 * @param start First node owned by the keyed entry.
 * @param end Last node owned by the keyed entry.
 */
function removeInclusiveRange(start: Node, end: Node): void {
  let node: Node | null = start;
  while (node) {
    const next: Node | null = node.nextSibling;
    node.parentNode?.removeChild(node);
    if (node === end) return;
    node = next;
  }
}

/**
 * Moves a retained keyed range before the requested cursor without changing node identity.
 * Atomic moveBefore preserves browser state when available; older browsers fall back to
 * fragment insertion, which preserves compatibility but may reset focus or embedded state.
 * @param start First node in the inclusive keyed range.
 * @param end Last node in the inclusive keyed range.
 * @param before Sibling that must follow the moved range.
 */
function moveInclusiveRange(start: Node, end: Node, before: Node): void {
  if (end.nextSibling === before) return;
  const parent = before.parentNode as AtomicMoveParent | null;
  if (!parent) return;

  if (typeof parent.moveBefore === 'function') {
    let node: Node | null = start;
    while (node) {
      const next: Node | null = node.nextSibling;
      parent.moveBefore(node, before);
      if (node === end) return;
      node = next;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  let node: Node | null = start;
  while (node) {
    const next: Node | null = node.nextSibling;
    fragment.append(node);
    if (node === end) break;
    node = next;
  }
  parent.insertBefore(fragment, before);
}

/**
 * Commits the next output through an existing renderer session.
 * @param instance Session previously returned by render().
 * @param output Next legacy or structured component output.
 * @returns Observable mutation summary for scheduling and diagnostics.
 */
export function patch(instance: RenderInstance, output: RenderOutput): CommitResult {
  return instance.update(output);
}

/**
 * Expresses a scheduled renderer update while preserving patch() semantics.
 * @param instance Session previously returned by render().
 * @param output Next legacy or structured component output.
 * @returns Observable mutation summary produced by patch().
 */
export function update(instance: RenderInstance, output: RenderOutput): CommitResult {
  return patch(instance, output);
}

/**
 * Mounts a backward-compatible string or structured renderer into one owned root.
 * The returned session remains valid when later outputs change rendering strategy.
 * @param root Component Element or ShadowRoot receiving committed DOM.
 * @param output Initial legacy or structured output.
 * @returns Stateful renderer session used by patch() and update().
 */
export function render(root: NativeRenderRoot, output: RenderOutput): RenderInstance {
  return new RenderSession(new NativeRoot(root), output);
}

export {html} from './template';
