import {bootstrap, type DotaElementConstructor} from '@ayu-sh-kr/dota-core';
import {createDotaLogger} from '@ayu-sh-kr/dota-common-utils';
import {trackPendingWork} from '@ayu-sh-kr/dota-ssr';

const logger = createDotaLogger('dota-wrap', 'lazy-components.ts');

/**
 * Longest stretch of element definitions before yielding. Defining an element upgrades and
 * hydrates every instance synchronously, so batching under the 50 ms long-task threshold
 * keeps a large route from blocking input while it starts.
 */
const DEFINITION_BUDGET_MS = 40;

/** Lets the browser handle input and paint before the next batch of definitions. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as {scheduler?: {yield?: () => Promise<void>}}).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  // The window timer (not the global one) lets server prerendering wait for pending definitions.
  return new Promise(resolve => window.setTimeout(resolve, 0));
}

/** Resolves one component constructor, typically through a dynamic `import()`. */
export type ComponentLoader = () => Promise<DotaElementConstructor>;

/**
 * Describes components that are defined only when a route or the document needs them.
 * `virtual:dota-component-registry` generates one for application components; libraries
 * and applications can declare their own with {@link defineComponentLoaders}.
 */
export type ComponentRegistry = {
  /** Loader per custom-element tag. */
  readonly loaders: Readonly<Record<string, ComponentLoader>>;
  /** Tags each tag renders, so a route's whole tree is fetched in parallel instead of level by level. */
  readonly dependencies?: Readonly<Record<string, readonly string[]>>;
};

/**
 * Declares lazily defined components keyed by tag, e.g. UI-library elements:
 * `defineComponentLoaders({'md-view': () => import('@ayu-sh-kr/dota-md').then(m => m.MdViewComponent)})`.
 * @param loaders Loader per custom-element tag.
 * @param dependencies Optional tags each tag renders.
 * @returns A registry accepted by `initializeApp({lazyComponents})`.
 */
export function defineComponentLoaders(
  loaders: Record<string, ComponentLoader>,
  dependencies: Record<string, readonly string[]> = {}
): ComponentRegistry {
  return {loaders, dependencies};
}

/**
 * Defines registry components on demand.
 * {@link ensure} loads a tag's dependency closure in parallel and defines it parents first,
 * yielding to the browser between batches that exceed a {@link DEFINITION_BUDGET_MS} budget. {@link observe} is the safety net for
 * tags that template scanning cannot see, such as names built at runtime.
 */
export class LazyComponentLoader {
  private readonly loaders = new Map<string, ComponentLoader>();
  private readonly dependencies = new Map<string, readonly string[]>();
  private readonly pending = new Map<string, Promise<DotaElementConstructor | undefined>>();
  /** Registry of the window this loader was created in; definitions stop if that window goes away. */
  private readonly registry: CustomElementRegistry | undefined = typeof customElements === 'undefined' ? undefined : customElements;

  /** @param registries Registries merged in order; a later loader for the same tag wins. */
  constructor(registries: readonly ComponentRegistry[]) {
    for (const registry of registries) {
      Object.entries(registry.loaders).forEach(([tag, loader]) => this.loaders.set(tag, loader));
      Object.entries(registry.dependencies ?? {}).forEach(([tag, tags]) => this.dependencies.set(tag, tags));
    }
  }

  /** Whether any registry provides a loader for `tag`. */
  has(tag: string): boolean {
    return this.loaders.has(tag);
  }

  /**
   * Lists the tags reachable from `tags`, breadth first, that have a loader and are not defined yet.
   * @param tags Entry tags such as a route page selector.
   * @returns Tags still to load, parents before children.
   */
  closure(tags: Iterable<string>): string[] {
    const visited = new Set<string>();
    const queue = [...tags];
    const missing: string[] = [];
    while (queue.length > 0) {
      const tag = queue.shift()!;
      if (visited.has(tag)) continue;
      visited.add(tag);
      if (this.loaders.has(tag) && !this.registry?.get(tag)) missing.push(tag);
      queue.push(...(this.dependencies.get(tag) ?? []));
    }
    return missing;
  }

  /**
   * Loads and defines `tags` and everything they render. Concurrent calls share loads,
   * and a failed loader is logged and retried on the next call instead of rejecting.
   * @param tags Entry tags such as a route page selector.
   */
  ensure(tags: Iterable<string>): Promise<void> {
    const missing = this.closure(tags);
    if (missing.length === 0) return Promise.resolve();
    // Server prerendering serializes the page only after this work, observer-started loads included.
    const work = this.define(missing);
    trackPendingWork(work);
    return work;
  }

  private async define(missing: string[]): Promise<void> {
    const constructors = await Promise.all(missing.map(tag => this.load(tag)));
    let batchStart = performance.now();
    for (const [index, constructor] of constructors.entries()) {
      if (!this.isCurrentRealm()) return;
      if (!constructor || this.registry?.get(missing[index])) continue;
      if (performance.now() - batchStart > DEFINITION_BUDGET_MS) {
        await yieldToMain();
        batchStart = performance.now();
        if (!this.isCurrentRealm()) return;
      }
      if (!this.registry?.get(missing[index])) bootstrap([constructor]);
    }
  }

  /** False once the window that created this loader is no longer the global one, e.g. after server prerendering. */
  private isCurrentRealm(): boolean {
    return this.registry !== undefined && typeof customElements !== 'undefined' && customElements === this.registry;
  }

  /**
   * Resolves every registered component without defining it, for server rendering.
   * @returns All constructors from all registries.
   */
  async loadAll(): Promise<DotaElementConstructor[]> {
    const constructors = await Promise.all([...this.loaders.keys()].map(tag => this.load(tag)));
    return constructors.filter((constructor): constructor is DotaElementConstructor => constructor !== undefined);
  }

  /**
   * Defines registry elements already in `root` and any added later, until every registry tag is defined.
   * @param root Subtree to watch, normally `document.documentElement`.
   * @returns Stops observing.
   */
  observe(root: Element): () => void {
    const ensureWithin = (element: Element) => {
      const tags = new Set<string>();
      if (!this.registry?.get(element.localName) && this.loaders.has(element.localName)) tags.add(element.localName);
      element.querySelectorAll(':not(:defined)').forEach(child => {
        if (this.loaders.has(child.localName)) tags.add(child.localName);
      });
      if (tags.size > 0) void this.ensure(tags);
    };

    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) ensureWithin(node as Element);
        });
      }
      if ([...this.loaders.keys()].every(tag => this.registry?.get(tag))) observer.disconnect();
    });
    observer.observe(root, {childList: true, subtree: true});
    ensureWithin(root);
    return () => observer.disconnect();
  }

  private load(tag: string): Promise<DotaElementConstructor | undefined> {
    let pending = this.pending.get(tag);
    if (!pending) {
      pending = this.loaders.get(tag)!().catch((error: unknown) => {
        logger.error(`Failed to load component <${tag}>`, error);
        this.pending.delete(tag);
        return undefined;
      });
      this.pending.set(tag, pending);
    }
    return pending;
  }
}
