import type {MapMetadataKey, MetadataRecord} from "@dota/metadata";
import {CoreMetadata} from "@dota/core/constants";
import {EventType, type MethodDetails} from "@dota/core/types";
import {createDotaLogger} from '@ayu-sh-kr/dota-common-utils';

const logger = createDotaLogger('dota-core', 'core/elements/component-lifecycle.ts');

/**
 * Settled promise whose reactions run as microtasks. V8 schedules these internally, which is
 * cheaper per call than the `queueMicrotask` binding on lifecycle paths run for every element.
 */
const settled = Promise.resolve();

/**
 * Runs `task` after `ticks` microtasks, reporting a thrown error instead of rejecting.
 * Connection and disconnection events keep the second-microtask timing their former
 * `Promise.all` chains had, so code awaiting a single microtask observes the same order.
 * @param ticks Number of microtask turns to wait; 1 for renders and `DOM_UPDATED`, 2 otherwise.
 * @param task Work deferred until the current synchronous lifecycle step completes.
 */
export function afterMicrotask(ticks: 1 | 2, task: () => void): void {
  const run = ticks === 1 ? task : () => { settled.then(task).catch((reason) => logger.error('Deferred lifecycle task failed', reason)); };
  settled.then(run).catch((reason) => logger.error('Deferred lifecycle task failed', reason));
}

/**
 * Calls a component's `@BeforeInit` or `@AfterInit` hooks in declaration order, base class first.
 * Hooks are looked up on the component by name rather than called from metadata, so a subclass
 * override of a hook method is the one that runs.
 * @param component Component whose hooks run; also the `this` of each hook.
 * @param metadata The component's metadata record.
 * @param key Hook registry to run: `CoreMetadata.beforeInit` or `CoreMetadata.afterInit`.
 */
export function runLifecycleHooks(component: object, metadata: MetadataRecord, key: MapMetadataKey<MethodDetails>): void {
  metadata.get(key).forEach(({name}) => {
    const hook = (component as Record<string, unknown>)[name];
    if (typeof hook === 'function') hook.call(component);
  });
}

/**
 * Adds a component's `@EventListener` handlers to the window or to the component itself.
 * Each handler is created once per connection and stored in `handlers`, because removal needs
 * the exact function that was added; a method already in `handlers` is skipped, so a repeated
 * call cannot stack listeners. Handlers call the method through the component, so overrides run.
 * @param component Component that receives `ROOT` events and is `this` for each handler.
 * @param metadata The component's metadata record.
 * @param handlers Per-component store of added handlers, keyed by method name.
 */
export function bindEventListeners(component: HTMLElement, metadata: MetadataRecord, handlers: Map<string, EventListener>): void {
  metadata.get(CoreMetadata.eventListeners).forEach((listener, method) => {
    if (handlers.has(method)) return;

    const handler: EventListener = (event) => (component as any)[listener.method]?.call(component, event);
    const target: EventTarget = listener.type === EventType.WINDOW ? window : component;
    target.addEventListener(listener.name, handler, listener.options);
    handlers.set(method, handler);
  });
}

/**
 * Removes the handlers {@link bindEventListeners} added and forgets them, so the next connection
 * adds fresh ones. Methods without a stored handler are ignored.
 * @param component Component the `ROOT` handlers were added to.
 * @param metadata The component's metadata record.
 * @param handlers Per-component store filled by {@link bindEventListeners}.
 */
export function unbindEventListeners(component: HTMLElement, metadata: MetadataRecord, handlers: Map<string, EventListener>): void {
  metadata.get(CoreMetadata.eventListeners).forEach((listener, method) => {
    const handler = handlers.get(method);
    if (!handler) return;

    const target: EventTarget = listener.type === EventType.WINDOW ? window : component;
    target.removeEventListener(listener.name, handler, listener.options);
    handlers.delete(method);
  });
}
