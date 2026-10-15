# dota-core metadata layer

Plan for replacing dota-core's `reflect-metadata` storage with a typed metadata layer. Every
decorator writes through the layer and every `BaseElement` lifecycle step reads through it.
Decorators then only *describe* a class. The layer owns storage, inheritance, and lookup speed,
which makes moving from TypeScript's legacy decorators to TC39 standard decorators an adapter
change instead of a storage rewrite.

## Problems in the current storage

Each item was found in the [15 October review](../performance/core-review-benchmark-2026-10-15.md)
or while reading the decorators for this plan.

| # | Problem | Effect |
| --- | --- | --- |
| 1 | Keys are `${constructor.name}:${kind}` strings in `reflect-metadata` | A subclass with another name cannot see its parent's decorators; minified names can collide |
| 2 | `@Property` pushes onto `constructor.observedAttributes` | A subclass appends to its parent's array, so the parent observes the child's attributes |
| 3 | `unbindWatchers` clears the map it looks up | It erases the class's watchers for every instance |
| 4 | `@BindEvent` walks the whole `composedPath()` | An ancestor outside the component that matches the selector triggers the handler |
| 5 | `@BeforeInit` / `@AfterInit` only run a method named `beforeViewInit` / `afterViewInit` | A hook on any other method is silently ignored |
| 6 | `@Watcher` calls the decorated function, not `this[name]` | A subclass override of a watcher never runs |
| 7 | Eleven `async` bind/unbind methods per connect | Promise allocation; a binding error becomes an unhandled rejection log |
| 8 | `@Component` stores an unused method list and `ClassName:shadow` key | Dead metadata per class |

## Design

New directory `packages/libs/dota-core/src/core/metadata/`, with no imports from the rest of
dota-core, so it can be used and tested standalone.

### Keys: scoping

A key is a typed, namespaced token created once, never a string assembled at the call site.

```ts
const PROPERTIES = MetadataKey.map<PropertyDetails>('dota.core.property');
const COMPONENT = MetadataKey.value<ComponentConfig>('dota.core.component');
```

- `value` keys hold one value. The nearest class in the inheritance chain wins.
- `map` keys hold named entries. Parent entries are inherited, and an entry with the same name in
  a subclass replaces the parent's.
- Identity is the key object, so two libraries using the same name never collide. The name is
  only for diagnostics. Duplicate names are allowed, because rejecting them would throw when Vite
  HMR re-evaluates a module that creates keys.

### Owners and inheritance

Metadata belongs to a class. `Metadata.for(target)` accepts every handle a decorator or
lifecycle method holds and resolves the owning class:

| Argument | Owner |
| --- | --- |
| A class (class decorator, static member) | that class |
| A prototype (legacy instance-member decorator) | `prototype.constructor` |
| An instance (lifecycle code) | `instance.constructor` |
| A TC39 decorator context (`{kind, metadata}`) | `context.metadata` |

Inherited reads walk the constructor chain. At each class they include records owned by the
class and by its own `Symbol.metadata` object, which is what TC39 decorators populate. Legacy
and standard decorators therefore resolve the same way during a migration.

### Fluent API

```ts
Metadata.for(Card.prototype)
  .add(PROPERTIES, 'title', {...})   // own write, returns the record
  .set(COMPONENT, config);

Metadata.for(card).get(PROPERTIES);  // inherited, merged, read-only, cached
Metadata.for(Card).own(PROPERTIES);  // this class only
Metadata.for(Card).has(COMPONENT);
```

- `for()` returns the owner's long-lived record, not a new wrapper, so the hot path allocates
  nothing. `BaseElement` resolves its record once per instance, so lifecycle reads skip owner
  resolution entirely.
- Inherited reads are cached per class and key. Any write anywhere bumps a global version, which
  invalidates the cache. Writes happen at class definition, so in steady state every read is one
  map lookup and one integer compare.
- Results are read-only. An empty result is one shared frozen map.

### Decorators

Each decorator becomes one `Metadata.for(target).add(...)` call against an exported key in
`metadata/keys.ts` (`CoreMetadata`). `@EventListener` previously patched `connectedCallback` and
`disconnectedCallback` on the prototype. It now only records metadata, and `BaseElement` binds it,
so every decorator is metadata-only. For a TC39 migration, only the decorator signature changes, because
`Metadata.for(context)` accepts the standard context.

### BaseElement and helpers

- All lifecycle reads use `Metadata.for(this).get(KEY)`.
- `observedAttributes` becomes a static getter on `BaseElement`, derived from the inherited
  `PROPERTIES`. That fixes #2 without mutating any class.
- Watchers are indexed per class as property → watcher names, built once from the cached map.
- Init hooks run every registered method in declaration order, via `this[name]` (#5, #6).
- Bind and unbind become synchronous (#7). Deferred lifecycle events keep their exact former
  microtask: the second for `CONNECTED`, `HYDRATED`, `@AfterInit`, and `DISCONNECTED`, and the
  first for `DOM_UPDATED`. They are scheduled as reactions on one settled promise, not with
  `queueMicrotask`; see [Review outcome](#review-outcome).
- The `@BindEvent` path walk stops at the component's render root (#4).

### Compatibility

- `HelperUtils.getComponentMetadata(ctor, 'Component')` stays public. dota-router and dota-ssr
  call it, and dota-ssr tests define `Component` with `Reflect`. It reads the layer first, then
  falls back to `reflect-metadata`.
- `HelperUtils.fetchOrCreate` and `readMetadata` become deprecated wrappers over
  `reflect-metadata` for third-party code. dota-core no longer uses them.
- `reflect-metadata` stays a dependency, because `emitDecoratorMetadata` output and dota-event
  need `Reflect.metadata`.

## Evidence required before merging

- The micro-benchmark from the review, plus a 300-class definition scenario: no regression on
  mount, property set, reconnect, or definition.
- Dota Web and Webingo SSG builds pass, and their load and navigation metrics stay within noise.
- New tests for inheritance, override, scoping, TC39-context owners, and each of bugs #2–#6.

## Review outcome

The plan was implemented, then changed where measurements or review contradicted it.

| Planned | Changed to | Evidence |
| --- | --- | --- |
| Reject duplicate key names | Allow them | Rejection throws when Vite HMR re-evaluates a key module |
| `Metadata.for(this)` on every lifecycle read | Resolve the record once per instance | Owner resolution and `WeakMap` lookups were 2.5% of profiled time |
| `queueMicrotask` for deferred lifecycle events | Reactions on one settled promise | `queueMicrotask` had 56 ms of self time; the disconnect flush regressed 51% |
| Lifecycle events one microtask after connect | The exact former tick (second for connect and disconnect) | The dota-ui popover test failed: its `@OnEvent(CONNECTED)` handler ran before code awaiting one microtask |
| `@EventListener` kept as a prototype patch | Metadata plus `BaseElement` binding | It was the one decorator that modified the class, and the patch stacked under inheritance |

The production builds surfaced bug #1 in shipped code. Webingo's `BlogMarkdownViewComponent extends
MdViewComponent` had silently lost every inherited `@Property`. With the layer, its 12 blog
article pages now reflect the inherited `content-class` attribute. That attribute is the only difference in either
application's generated HTML, apart from bundle hashes and Dota Web's per-build random popover IDs.

Measurements are in the
[metadata layer benchmark](../performance/metadata-layer-benchmark-2026-10-15.md).
