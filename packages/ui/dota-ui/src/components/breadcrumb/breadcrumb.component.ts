import {BaseElement, Component, HostListener, Number, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";
import {BreadcrumbStyle} from "@dota/components/breadcrumb/breadcrumb.config.ts";
import type {BreadcrumbStyleConfig} from "@dota/components/breadcrumb/breadcrumb.config.ts";

/**
 * Describes one location supplied by a router or a static breadcrumb consumer.
 * The component derives an ID when one is omitted and treats an absent href as
 * the current, non-navigable location when the item is last in the path.
 */
export interface BreadcrumbItem {
  /** Identifies the location for navigation events and machine commands. */
  id?: string;
  /** Text shown to the user; blank labels are removed during normalization. */
  label: string;
  /** Destination for ancestor links; `null` or omission makes an item non-linkable. */
  href?: string | null;
}

/**
 * Represents a path item after the machine has assigned identity and position.
 * Rendering consumes these flags so root and current preservation stays outside
 * the visual template and remains consistent across folded and full paths.
 */
export interface NormalizedBreadcrumbItem extends BreadcrumbItem {
  /** Always-present identity used by links and navigation commands. */
  id: string;
  /** Normalized non-empty label rendered by the skin. */
  label: string;
  /** Normalized destination, or `null` when no destination was supplied. */
  href: string | null;
  /** Zero-based position in the complete normalized path. */
  index: number;
  /** Marks the first path item retained as the trail root. */
  isRoot: boolean;
  /** Marks the final path item rendered as the current page. */
  isCurrent: boolean;
}

/**
 * Immutable state published by `BreadcrumbMachine` after each command.
 * It is the handoff between navigation policy and the light-DOM renderer.
 */
export interface BreadcrumbSnapshot {
  /** Complete normalized path, including folded items. */
  crumbs: ReadonlyArray<Readonly<NormalizedBreadcrumbItem>>;
  /** Items rendered in the primary row. */
  visible: ReadonlyArray<Readonly<NormalizedBreadcrumbItem>>;
  /** Items represented by the fold control. */
  folded: ReadonlyArray<Readonly<NormalizedBreadcrumbItem>>;
  /** Whether hidden items exist. */
  isFolded: boolean;
  /** Whether the fold menu is open. */
  foldOpen: boolean;
  /** Whether navigation is awaiting settlement. */
  busy: boolean;
  /** Requested item retained for retry. */
  pending: string | null;
  /** Navigation error, if any. */
  error: string | null;
  /** Number of normalized path items. */
  depth: number;
  /** Monotonic navigation revision used to reject stale router responses. */
  revision: number;
}

/**
 * Normalizes router input into uniquely addressable locations.
 * Blank labels are removed and duplicate IDs receive deterministic suffixes,
 * allowing imperfect route data to remain navigable without throwing.
 * @param items Raw locations supplied by a consumer or router.
 * @returns A new normalized list with stable IDs and null missing hrefs.
 */
export function normalizeBreadcrumbItems(items: BreadcrumbItem[] | null | undefined): NormalizedBreadcrumbItem[] {
  const seen = new Set<string>();
  const normalized = (items ?? []).flatMap((item, sourceIndex) => {
    const label = globalThis.String(item?.label ?? "").trim();
    if (!label) return [];
    const href = item.href == null ? null : globalThis.String(item.href);
    const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    let id = globalThis.String((item.id ?? href ?? labelSlug) || `crumb-${sourceIndex}`);
    while (seen.has(id)) id += "~";
    seen.add(id);
    return [{id, label, href, index: 0, isRoot: false, isCurrent: false}];
  });
  return normalized.map((item, index) => ({...item, index, isRoot: index === 0, isCurrent: index === normalized.length - 1}));
}

/** Carries the primary-row items and middle items exposed by one fold control. */
export interface BreadcrumbPartition {
  /** Items retained in the primary row, in display order. */
  visible: NormalizedBreadcrumbItem[];
  /** Middle items represented by the fold control. */
  folded: NormalizedBreadcrumbItem[];
}

/**
 * Applies the keep-both-ends folding policy from the reference trail.
 * The budget counts crumbs; folds smaller than `foldMin` are suppressed so a
 * disclosure control is not shown when it saves negligible space.
 * @param crumbs Normalized items to partition.
 * @param budget Maximum visible count, or `null` for the complete path.
 * @param foldMin Minimum hidden count that justifies a control.
 * @returns The visible and folded partitions.
 */
export function partitionBreadcrumb(crumbs: NormalizedBreadcrumbItem[], budget: number | null, foldMin: number): BreadcrumbPartition {
  if (budget === null || crumbs.length <= budget) {
    return {visible: [...crumbs], folded: []};
  }

  const count = Math.max(1, Math.trunc(budget));
  const folded = count >= 2 ? crumbs.slice(1, crumbs.length - count + 1) : crumbs.slice(0, -1);
  if (folded.length < Math.max(1, Math.trunc(foldMin))) {
    return {visible: [...crumbs], folded: []};
  }

  return {
    visible: count >= 2
      ? [crumbs[0], ...crumbs.slice(crumbs.length - count + 1)]
      : [crumbs[crumbs.length - 1]],
    folded,
  };
}

/** Receives immutable machine snapshots so a component or router can react to state changes. */
type BreadcrumbListener = (state: BreadcrumbSnapshot) => void;

/**
 * Owns path, folding, and navigation state independently from the DOM skin.
 * With no listener, navigation settles locally for static breadcrumb usage;
 * a listener may instead call `settle` or `fail` after routing completes.
 */
export class BreadcrumbMachine {
  private crumbs: NormalizedBreadcrumbItem[];
  private budget: number | null;
  private foldOpen = false;
  private busy = false;
  private pending: string | null = null;
  private error: string | null = null;
  private revision = 0;
  private readonly listeners = new Set<BreadcrumbListener>();

  /**
   * Creates a machine with a normalized path and optional visible-item budget.
   * The default fold threshold avoids rendering a control for a trivial hidden
   * section while callers can lower or raise that policy explicitly.
   * @param items Source path supplied by a router or static consumer.
   * @param budget Maximum visible crumbs, or `null` to show the full path.
   * @param foldMin Minimum hidden items required before folding is enabled.
   */
  constructor(items: BreadcrumbItem[] = [], budget: number | null = null, private readonly foldMin = 2) {
    this.crumbs = normalizeBreadcrumbItems(items);
    this.budget = budget == null ? null : Math.max(1, Math.trunc(budget));
  }

  /**
   * Derives the public state from the complete path and current fold policy.
   * Partitioning happens on every read so callers never observe stale visible
   * or folded arrays after changing the budget or path.
   * @returns An immutable snapshot suitable for listeners and router state.
   */
  get(): BreadcrumbSnapshot {
    const partition = partitionBreadcrumb(this.crumbs, this.budget, this.foldMin);
    return Object.freeze({
      crumbs: Object.freeze([...this.crumbs]),
      visible: Object.freeze(partition.visible),
      folded: Object.freeze(partition.folded),
      isFolded: partition.folded.length > 0,
      foldOpen: this.foldOpen && partition.folded.length > 0,
      busy: this.busy,
      pending: this.pending,
      error: this.error,
      depth: this.crumbs.length,
      revision: this.revision,
    });
  }

  /**
   * Registers a state consumer and returns its exact teardown operation.
   * Keeping listeners in a set prevents duplicate notifications while allowing
   * a rendered component to detach without affecting other consumers.
   * @param listener Callback invoked after a machine command publishes state.
   * @returns A function that removes this listener and reports whether removal occurred.
   */
  subscribe(listener: BreadcrumbListener): () => boolean {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Publishes one immutable snapshot to current consumers in registration order.
   * Notification occurs after the state has been derived, so every listener in
   * one publication observes the same object and cannot trigger stale reads.
   * @returns The snapshot delivered to listeners.
   */
  private publish(): BreadcrumbSnapshot {
    const state = this.get();
    this.listeners.forEach(listener => listener(state));
    return state;
  }

  /**
   * Replaces the complete path and resets transient fold and navigation state.
   * Resetting pending state prevents a response for the previous route from
   * being interpreted as a request against the new path.
   * @param items New source path to normalize and publish.
   * @returns The resulting immutable snapshot.
   */
  set(items: BreadcrumbItem[]): BreadcrumbSnapshot {
    this.crumbs = normalizeBreadcrumbItems(items);
    this.foldOpen = false;
    this.pending = null;
    this.error = null;
    this.busy = false;
    return this.publish();
  }

  /**
   * Updates the visible crumb budget while preserving the complete source path.
   * Repartitioning is published immediately so the renderer can add or remove
   * the fold control without waiting for a route change.
   * @param budget Maximum visible crumbs, or `null` for the complete path.
   * @returns The resulting immutable snapshot.
   */
  fit(budget: number | null): BreadcrumbSnapshot {
    this.budget = budget == null ? null : Math.max(1, Math.trunc(budget));
    return this.publish();
  }

  /**
   * Opens the fold only when the current budget has hidden middle items.
   * Calling it on a complete path still publishes state, but cannot produce an
   * open disclosure because `foldOpen` is derived from the folded partition.
   * @returns The resulting immutable snapshot.
   */
  openFold(): BreadcrumbSnapshot {
    if (this.get().isFolded) this.foldOpen = true;
    return this.publish();
  }

  /**
   * Closes the fold without changing the path or pending navigation request.
   * Publishing the closed state lets external renderers update while leaving
   * router-owned state untouched.
   * @returns The resulting immutable snapshot.
   */
  closeFold(): BreadcrumbSnapshot {
    this.foldOpen = false;
    return this.publish();
  }

  /**
   * Toggles the fold disclosure according to its current open state.
   * Delegating to the open and close policies keeps hidden-item checks in one
   * place instead of duplicating them in the toggle command.
   * @returns The resulting immutable snapshot.
   */
  toggleFold(): BreadcrumbSnapshot {
    return this.foldOpen ? this.closeFold() : this.openFold();
  }

  /**
   * Starts navigation to an ancestor and closes any open fold.
   * With no listener the machine settles locally; with a listener it retains a
   * pending target until the router calls `settle` or `fail`.
   * @param id Normalized path identity requested by the user.
   * @param force Whether the current item may be requested explicitly.
   * @returns The resulting immutable snapshot.
   */
  go(id: string, force = false): BreadcrumbSnapshot {
    const index = this.crumbs.findIndex(item => item.id === id);
    if (index < 0 || (!force && index === this.crumbs.length - 1)) return this.get();
    this.revision++;
    this.pending = id;
    this.busy = true;
    this.error = null;
    this.foldOpen = false;
    const state = this.publish();
    return this.listeners.size ? state : this.set(this.crumbs.slice(0, index + 1));
  }

  /**
   * Applies a router response only when it belongs to the active revision.
   * Older responses are ignored; a supplied path replaces the route, otherwise
   * the path is truncated through the requested ancestor.
   * @param revision Revision returned with the router response.
   * @param path Optional canonical path returned by the router.
   * @returns The resulting immutable machine snapshot.
   */
  settle(revision = this.revision, path?: BreadcrumbItem[]): BreadcrumbSnapshot {
    if (revision !== this.revision) return this.get();

    const index = this.crumbs.findIndex(item => item.id === this.pending);
    return path
      ? this.set(path)
      : this.set(index < 0 ? this.crumbs : this.crumbs.slice(0, index + 1));
  }

  /**
   * Records a router failure without discarding the requested destination.
   * @param message User-facing failure text retained in the snapshot.
   * @param revision Revision associated with the failed request.
   * @returns The unchanged path with busy state cleared and error state set.
   */
  fail(message = "That level would not open", revision = this.revision): BreadcrumbSnapshot {
    if (revision !== this.revision) return this.get();

    this.busy = false;
    this.error = message;
    return this.publish();
  }

  /**
   * Retries the retained destination only after a failed request has settled.
   * A missing target or active request returns the current state unchanged.
   * @returns The resulting immutable snapshot.
   */
  retry(): BreadcrumbSnapshot {
    return this.pending && !this.busy ? this.go(this.pending) : this.get();
  }
}

/**
 * Renders a semantic, light-DOM breadcrumb with a themeable fold menu.
 * `path`, `budget`, `fold-min`, `label`, and `config` are public attributes /
 * properties; ancestor clicks emit `dota-breadcrumb:navigate`.
 */
@Component({selector: "dota-breadcrumb", shadow: false})
class BreadcrumbComponent extends BaseElement {
  /** Complete path consumed by the machine; HTML users provide serialized JSON. */
  @Property({name: "path", type: ObjectType}) path: BreadcrumbItem[] = [];
  /** Maximum number of crumbs shown in the primary row, or `null` for all. */
  @Property({name: "budget", type: Number}) budget: number | null = null;
  /** Minimum hidden middle items required before the fold control is rendered. */
  @Property({name: "fold-min", type: Number}) foldMin = 2;
  /** Accessible name assigned to the breadcrumb navigation landmark. */
  @Property({name: "label", type: String}) label = "Breadcrumb";
  /** Consumer-owned classes appended to the outer component surface. */
  @Property({name: "classname", type: String}) className = "";
  /** Per-instance visual slot replacements; omitted slots use the default skin. */
  @Property({name: "config", type: ObjectType}) config: BreadcrumbStyleConfig = {};
  /** Navigation and fold state shared with the rendered light-DOM skin. */
  machine!: BreadcrumbMachine;
  private readonly foldPanelId = `dota-breadcrumb-fold-${this.__uid}`;

  constructor() { super(); }

  /**
   * Creates the state owner after framework properties have been bound.
   * The subscription keeps the light-DOM skin synchronized with machine changes
   * without making the machine depend on custom-element lifecycle details.
   */
  @OnEvent("connected", true)
  initializeMachine(): void {
    this.machine = new BreadcrumbMachine(this.path, this.budget, this.foldMin);
    this.machine.subscribe(() => this.updateHTML());
  }

  /**
   * Emits navigation intent for a normal left-click on an ancestor link.
   * Modified clicks remain native browser operations so opening a new tab or
   * copying a destination is not intercepted by the component.
   * @param event Click event delegated from the light-DOM component root.
   */
  @HostListener({event: "click"})
  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>("a[data-breadcrumb-id]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const id = link.dataset.breadcrumbId!;
    this.dispatchEvent(new CustomEvent("dota-breadcrumb:navigate", {
      detail: {id, state: this.machine.go(id)},
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Closes an open machine fold from the keyboard and restores focus to its
   * trigger. The nested popover owns its own visual dismissal behavior.
   * @param event Key event delegated from the light-DOM component root.
   */
  @HostListener({event: "keydown"})
  handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.machine?.get().foldOpen) return;

    this.machine.closeFold();
    this.querySelector<HTMLButtonElement>("[data-breadcrumb-fold]")?.focus();
  }

  /**
   * Merges consumer slots over the default visual contract.
   * Shallow merging keeps omitted slots intact and preserves an explicit empty
   * string, allowing a consumer to intentionally remove a class slot.
   * @returns The resolved visual slots used by the current render.
   */
  private getStyle(): BreadcrumbStyleConfig & typeof BreadcrumbStyle {
    return {...BreadcrumbStyle, ...this.config};
  }

  /**
   * Escapes consumer-provided text before interpolation into light-DOM markup.
   * This protects labels, IDs, URLs, class names, and accessible names from
   * changing the generated element structure.
   * @param value Text supplied through a public property or path item.
   * @returns HTML-safe text with the five markup-significant characters encoded.
   */
  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!);
  }

  /**
   * Converts the current machine snapshot into accessible light-DOM markup.
   * The template intentionally references `dota-icon` and `dota-popover` without
   * registering them; the consuming application owns registration and loading.
   * @returns Rendered breadcrumb markup using the resolved visual slots.
   */
  render(): string {
    const style = this.getStyle();
    const state = (this.machine ?? new BreadcrumbMachine(this.path, this.budget, this.foldMin)).get();
    const crumb = (item: NormalizedBreadcrumbItem) => item.isCurrent
      ? `<span class="${style.current}" aria-current="page" title="${this.escape(item.label)}">${this.escape(item.label)}</span>`
      : `<a class="${style.crumb}" href="${this.escape(item.href ?? "#")}" data-breadcrumb-id="${this.escape(item.id)}">${this.escape(item.label)}</a>`;
    const separator = [
      `<span class="${style.separator}" aria-hidden="true">`,
      `<dota-icon class="inline-flex shrink-0 leading-none" name="${this.escape(style.separatorIcon)}" `,
      `classname="${this.escape(style.separatorIconClass)}" size="sm"></dota-icon>`,
      `</span>`,
    ].join("");
    const renderItem = (item: NormalizedBreadcrumbItem, index: number) => [
      `<div role="listitem" class="${style.item}">`,
      index ? separator : "",
      crumb(item),
      `</div>`,
    ].join("");
    const items = state.visible.map(renderItem).join("");
    const menuItems = state.folded.map(item => [
      `<div role="listitem">`,
      `<a class="${style.menuItem}" href="${this.escape(item.href ?? "#")}" data-breadcrumb-id="${this.escape(item.id)}">`,
      `<span class="mr-3 font-mono text-xs text-gray-400">${item.index + 1}</span>`,
      this.escape(item.label),
      `</a></div>`,
    ].join("")).join("");
    const menu = state.isFolded ? [
      `<div id="${this.foldPanelId}" class="${style.menu}" role="dialog" aria-label="Hidden breadcrumb levels" style="display: none; position: absolute;">`,
      `<div class="m-0 grid list-none gap-0.5 p-0" role="list">${menuItems}</div>`,
      `</div>`,
    ].join("") : "";
    const fold = state.isFolded ? [
      `<div role="listitem" class="${style.item}">`,
      state.visible.length > 1 ? separator : "",
      `<dota-popover class="inline-flex items-center leading-none" placement="bottom-start" offset="8" anchored-selector="#${this.foldPanelId}">`,
      `<button type="button" class="${style.fold}" data-breadcrumb-fold aria-label="${state.folded.length} more level${state.folded.length === 1 ? "" : "s"}">`,
      `<dota-icon class="inline-flex shrink-0 leading-none" name="${this.escape(style.foldIcon)}" `,
      `classname="${this.escape(style.foldIconClass)}" size="sm"></dota-icon>`,
      `</button></dota-popover></div>`,
      menu,
    ].join("") : "";
    const listItems = state.isFolded && state.visible.length > 1
      ? [renderItem(state.visible[0], 0), fold, ...state.visible.slice(1).map((item, index) => renderItem(item, index + 1))].join("")
      : state.isFolded ? fold + items : items;
    return [
      `<div class="not-prose ${style.container} ${this.escape(this.className)}">`,
      `<nav class="${style.nav}" aria-label="${this.escape(this.label)}">`,
      `<div class="${style.list}" role="list">${listItems}</div>`,
      `</nav>`,
      `<p class="${style.live}" aria-live="polite" aria-atomic="true"></p>`,
      `</div>`,
    ].join("");
  }
}

export {BreadcrumbComponent, BreadcrumbStyle as BreadcrumbConfig};
export type {BreadcrumbStyleConfig};
