# Dota Core rendering, hydration, and patching architecture roadmap

**Status:** Proposed next-step architecture; no runtime code in this document is implemented  
**Reviewed:** 2026-08-05  
**Scope:** `@ayu-sh-kr/dota-core` rendering, reactivity, hydration, DOM patching, and lifecycle boundaries  
**Primary implementation:** [`BaseElement`](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts)

## Executive summary

Dota Core has completed the safe optimizations that can be made while every render is an
opaque HTML string. Property and state changes are batched, reflected attributes no longer
re-enter the property setter, delegated events survive DOM replacement, and falsy template
values are preserved. Those changes materially reduce repeated work, but the final commit is
still a complete `innerHTML` replacement.

The next step should not add more conditions to `BaseElement`. It should turn `BaseElement`
into a small adapter between native custom-element callbacks and a separate component runtime.
That runtime should coordinate independent APIs for:

- change detection;
- update scheduling;
- property/attribute conversion and reflection;
- choosing or adopting a render root;
- legacy string rendering;
- structured template rendering and DOM patching;
- hydration and mismatch recovery;
- view event and element-reference binding;
- lifecycle notification and diagnostics.

The primary new rendering model should be a **structured tagged template**. Its static strings
identify the template, while its dynamic values identify the exact DOM parts that may change.
On the first client render, Dota clones the static structure and creates part references. On
later renders, it compares only the dynamic values and patches only the affected text,
attribute, property, boolean attribute, or list part.

Hydration should use the same compiled template and part model. Server- or build-rendered DOM
must include a template identity and stable part markers. The hydration API then adopts the
existing light DOM or declarative shadow root, reconnects part objects and event behavior, and
performs no root replacement when the markup matches. If it does not match, a documented
policy either reports the error or replaces only that component's render root.

The existing string API must remain available during migration. A `StringRenderEngine` can
preserve current behavior and add an identical-output no-op. A generic parsed-HTML diff may be
offered later as a compatibility bridge, but it should not be the foundation of hydration or
the new renderer: it still pays for string creation and HTML parsing and lacks reliable dynamic
boundaries.

This roadmap deliberately separates **diffing** from **patching**:

- diffing answers, “which values or keyed items changed?”;
- patching answers, “which smallest DOM operation applies that change?”;
- rendering coordinates mount, update, or replacement;
- hydration attaches those same patch points to DOM that already exists.

## Recommended outcome

The target mental model is:

```text
Browser callback
  -> BaseElement forwards the callback
    -> ComponentRuntime coordinates one component instance
      -> ChangeTracker records meaningful changes
      -> UpdateScheduler batches eligible runtimes
      -> RenderRootController adopts or creates the root
      -> RenderEngine mounts or updates
         -> StringRenderEngine replaces legacy output
         -> TemplateRenderEngine patches known parts
      -> HydrationEngine adopts compatible existing DOM
      -> ViewBindingController wires behavior and references
      -> LifecycleDispatcher publishes stable lifecycle events
```

`BaseElement` remains the public class that components extend. It stops being the place where
every rendering policy is implemented.

## What was reviewed

This proposal combines the evidence and unfinished work from:

- the [original rendering and hydration audit](../../../../standards/audits/dota-core-base-element-rendering-hydration-audit.md);
- the [P2–P6 implementation report](./base-element-p2-p6-rendering-improvement-plan.md);
- the [performance follow-up](./base-element-performance-follow-up.md);
- the [startup rendering and viewport deferral plan](./base-element-startup-render-deferral-plan.md);
- the current `BaseElement`, `PropertyUtils`, `HTML`, decorators, bootstrap API, exports, and
  tests.

The workspace inventory on 2026-08-05 found 127 TypeScript files containing a class that extends
`BaseElement` or `DotaPageElement`, 79 files containing an explicit `render(): string`, 38 files
using the `HTML` tag, and 15 files calling `updateHTML()`. These counts include application,
library, UI, and test code. They show why the migration must be incremental rather than changing
the return type and semantics of `HTML` in one release.

## Current position

### What the P2–P6 implementation solved

The implemented changes established useful compatibility guarantees:

- several synchronous property or state mutations in one task schedule one component update;
- a direct `updateHTML()` call consumes a pending scheduled update;
- property reflection is marked so the resulting attribute callback does not parse and assign
  the same value again;
- external attribute changes still update typed property storage and watchers;
- `@BindEvent` uses stable root delegation and is not rebound after every replacement;
- `@Element` references are refreshed after replacement;
- watchers remain synchronous per meaningful mutation;
- attribute lifecycle events are emitted in mutation order after the final DOM exists;
- `0`, `false`, and empty string are handled intentionally by `HTML`.

The recorded microbenchmarks in the implementation report showed fewer renders and lower update
time for the tested state and property batches. Those results validate batching. They do not
measure structured templates, DOM patching, or hydration because those features do not exist
yet.

### The remaining ceiling

Every successful update still follows this shape:

```text
render the complete string
  -> parse the complete string
    -> remove all current descendants
      -> create all replacement descendants
        -> reconnect nested custom elements
          -> query every @Element reference again
```

This has five important consequences:

1. A one-character text change has the same replacement boundary as a completely different
   view.
2. Input selection, focus, scroll position, media state, and other DOM-owned state can be lost.
3. Child custom-element instances are destroyed and recreated even when their host markup is
   unchanged.
4. Existing server- or build-rendered markup is overwritten during connection.
5. The renderer cannot know which interpolation produced which node because `HTML` has already
   flattened the template strings and values into one string.

### Startup and reactive updates are different problems

Microtask batching improves updates after a component has mounted. It does not defer the first
`bindHTML()` call. On the current landing page, registered custom elements render synchronously
in a nested main-thread cascade. They do not render in parallel. Viewport mounting and
`content-visibility` remain separate policies built on top of the runtime in this proposal.

Hydration is the long-term path for meaningful initial content: the browser can parse and show
the content immediately, and the client can make it interactive without rebuilding it.

## Problems in the current API boundary

### `BaseElement` has too many reasons to change

The current 681-line class owns all of the following:

| Responsibility | Current owner | Why it should move |
| --- | --- | --- |
| Native custom-element callbacks | `BaseElement` | This is the responsibility the class should keep |
| Initialization state | `BaseElement` booleans | Hydration and deferred mount need an explicit state machine |
| Update batching | `requestHTMLUpdate()` | Scheduling should be replaceable and shared across instances |
| Attribute change queue | `BaseElement` array | Attribute semantics belong with property/attribute control |
| Root creation | `bindHTML()` | Root adoption is hydration-sensitive and must be idempotent |
| Full DOM commit | `bindHTML()` / `updateHTML()` | Different render engines need different commit behavior |
| Property setup | `PropertyUtils` called by `BaseElement` | Definition compilation and instance storage need a stable API |
| State accessors | `BaseElement.bindState()` | Property and state change detection should share one controller |
| Metadata lookup | Most bind methods | Immutable decorator data should compile once per class |
| View events | `BaseElement.bindMethods()` | Event routing can evolve without editing the element class |
| Host/global events | `BaseElement` | These are connection resources, not rendering operations |
| `@Element` queries | `BaseElement.bindElements()` | Patch-aware rebinding should happen only when structure changes |
| Lifecycle publication | `BaseElement` | Mount, hydrate, update, and disconnect need explicit results |
| Application event managers | `BaseElement` | Existing managers can be coordinated as connection resources |

Adding a hydration branch, a template branch, a string-diff branch, and viewport policies inside
this class would increase coupling and make every renderer patch a `BaseElement` patch.

### `shadowRoot` and `isShadow` should not be framework storage

`HTMLElement.shadowRoot` is a native, read-only browser API. `BaseElement` currently redeclares
it and assigns the result of `attachShadow()` to it. Because the package enables
`useDefineForClassFields`, that class field can also create an own instance property that shadows
the native prototype getter. The runtime should remove the redeclaration, store a private
`renderRoot: HTMLElement | ShadowRoot`, and read the real native `host.shadowRoot` when it needs
to adopt an existing root.

This matters for hydration. A declarative shadow root already exists by the time the custom
element upgrades. Calling `attachShadow()` with the matching mode returns that root **after
clearing it**, so the safe behavior is to use `host.shadowRoot` directly when present. See the
[current `attachShadow()` behavior](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#calling_this_method_on_an_element_that_is_already_a_shadow_host).

`isShadow` should likewise become immutable component-definition data rather than a public,
mutable instance field.

### Metadata reads currently create metadata

`HelperUtils.fetchOrCreate()` is useful to decorators while they register metadata. It is used
by runtime readers too, so asking “does this component have bindings?” allocates and stores an
empty `Map` when the answer is no.

The next runtime needs two different operations:

```ts
metadataWriter.getOrCreate(target, key); // decorator registration only
metadataReader.get(target, key);         // runtime read; never mutates
```

The reader feeds a one-time `ComponentDefinitionCompiler`. Component instances consume the
compiled definition and do not repeatedly interpret decorator maps.

### Synchronous work looks asynchronous

Many bind and unbind methods are declared `async` but do not await anything. Their bodies run
synchronously, allocate resolved promises, and are collected into `Promise.all()`. This does
not move work off the main thread.

The extracted controllers should expose synchronous `connect()`, `mount()`, and `disconnect()`
methods unless an operation is genuinely asynchronous. `updateComplete` can still provide an
honest promise for consumers who need to wait for a scheduled commit.

## Architectural rules

The following rules keep the extraction useful instead of merely moving lines into more files.

1. **One owner per piece of mutable state.** The update queue is owned by the scheduler, root
   state by the root controller, and property/attribute state by the reactive controller.
2. **An interface must represent a policy or replacement boundary.** Do not create a class for
   a two-line helper used once.
3. **Legacy behavior remains a strategy.** It should not be copied into every new path.
4. **The hot path stays direct.** Diagnostics and extension hooks must be optional and should not
   allocate an operation log during every production patch.
5. **The browser remains the DOM implementation.** Dota does not need a full virtual DOM.
6. **Structured templates are the primary diff input.** Generic tree diffing is a compatibility
   option, not the core model.
7. **Hydration and client rendering share one template definition.** Two independent renderers
   will eventually disagree.
8. **Correctness is eager by default.** Viewport and offscreen policies are opt-in.
9. **Existing component boundaries are preserved.** A parent patches only DOM owned between its
   template part markers; it does not inspect or diff a child's internal render root.
10. **Public APIs describe behavior, not implementation classes.** Internal files may change
    without forcing application migrations.

## Proposed package-level architecture

### `BaseElement`: native lifecycle adapter

The intended class becomes small enough to understand as one straight-line adapter:

```ts
export abstract class BaseElement extends HTMLElement {
  readonly #runtime: ComponentRuntime;

  protected constructor() {
    super();
    this.#runtime = runtimeFor(this).createComponentRuntime(this);
  }

  connectedCallback(): void {
    this.#runtime.connect();
  }

  disconnectedCallback(): void {
    this.#runtime.disconnect();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    this.#runtime.attributeChanged(name, oldValue, newValue);
  }

  requestUpdate(name?: PropertyKey, previous?: unknown): void {
    this.#runtime.requestUpdate(name, previous);
  }

  flushUpdate(): CommitResult | undefined {
    return this.#runtime.flush();
  }

  get updateComplete(): Promise<CommitResult> {
    return this.#runtime.updateComplete;
  }

  abstract render(): RenderOutput;
}
```

The names are proposals. The important decision is the direction of dependency: the element
forwards browser signals to the runtime; render engines do not reach back into private element
fields.

### `RuntimeEnvironment`: dependency owner

A runtime environment holds replaceable framework services:

```ts
export interface RuntimeEnvironment {
  readonly scheduler: UpdateScheduler;
  readonly definitions: ComponentDefinitionRegistry;
  readonly renderers: RenderEngineRegistry;
  readonly hydrator: HydrationEngine;
  readonly diagnostics?: RuntimeDiagnostics;

  createComponentRuntime(host: BaseElement): ComponentRuntime;
}
```

Bootstrap should associate an environment with a constructor before calling
`customElements.define()`:

```ts
const runtime = createDotaRuntime({
  scheduler: new MicrotaskUpdateScheduler(),
  renderers: [new StringRenderEngine(), new TemplateRenderEngine()],
});

bootstrap([CounterElement, UserCard], {runtime});
```

A default environment keeps `bootstrap(elements)` compatible. Constructor-to-environment
association should use a `WeakMap`, not a mutable global on every component. This also gives
tests a clean way to inject a fake scheduler, renderer, hydrator, or diagnostics collector.

`dota-wrap` currently calls `bootstrap(components)` inside `registerComponents()`. Its `AppConfig`
should gain an optional runtime/environment field and pass it through that registration path.
The wrapper remains the composition root; component classes do not import or construct global
runtime services themselves.

### `ComponentDefinition`: immutable class plan

Decorator metadata is constant after a component class is defined. Compile it once per
constructor:

```ts
export interface ComponentDefinition {
  readonly selector: string;
  readonly root: "light" | {mode: "open"};
  readonly rendering: RenderingOptions;
  readonly propertiesByName: ReadonlyMap<PropertyKey, PropertyDefinition>;
  readonly propertiesByAttribute: ReadonlyMap<string, PropertyDefinition>;
  readonly states: readonly StateDefinition[];
  readonly viewEventsByType: ReadonlyMap<string, readonly ViewEventBinding[]>;
  readonly hostEvents: readonly EventBinding[];
  readonly windowEvents: readonly EventBinding[];
  readonly documentEvents: readonly EventBinding[];
  readonly elementQueries: readonly ElementQuery[];
  readonly lifecycleHooks: LifecycleHooks;
}
```

`ComponentDefinitionCompiler` should:

- read without creating decorator metadata;
- merge inherited definitions deliberately;
- validate duplicate attributes, selectors, methods, and element queries once;
- group delegated view bindings by event type once;
- precompute attribute-to-property lookup;
- freeze or otherwise expose a read-only definition;
- cache by constructor in a `WeakMap`.

This is the **Flyweight** pattern: all instances share the expensive immutable plan while each
runtime keeps only its own values, dirty set, render instance, and connection resources.

### `ComponentRuntime`: per-instance coordinator

`ComponentRuntime` is the only object that knows the complete update sequence. It should own
meaningful component state, not implement every subsystem itself:

```ts
type ComponentPhase =
  | "constructed"
  | "connected-unmounted"
  | "mounting"
  | "mounted"
  | "hydrated"
  | "updating"
  | "disconnected";

export interface ComponentRuntime {
  readonly host: BaseElement;
  readonly definition: ComponentDefinition;
  readonly phase: ComponentPhase;
  readonly updateComplete: Promise<CommitResult>;

  connect(): void;
  disconnect(): void;
  attributeChanged(name: string, oldValue: string | null, newValue: string | null): void;
  requestUpdate(name?: PropertyKey, previous?: unknown): void;
  performUpdate(): CommitResult;
  flush(): CommitResult | undefined;
}
```

It coordinates the controllers in a fixed order and contains the connection generation used to
ignore stale microtasks or observer callbacks after disconnect. It should not parse attributes,
walk templates, or attach individual listeners itself.

## Public rendering API

### Keep the current string tag during migration

Changing `HTML` from `string` to an object would break explicitly typed render methods, string
helpers, array joins, Markdown output, and consumers that pass rendered fragments through other
string APIs.

Recommended transition:

```ts
// Existing API. It keeps returning a string in the compatibility period.
HTML`<p>${this.message}</p>`;

// New opt-in API. It returns structured template data.
html`<p>${this.message}</p>`;
```

`BaseElement.render()` can widen to a union without forcing existing subclasses to migrate:

```ts
export type RenderOutput = string | TemplateResult | typeof noView;

export interface TemplateResult {
  readonly kind: "dota-template";
  readonly strings: TemplateStringsArray;
  readonly values: readonly unknown[];
}
```

The actual `TemplateResult` needs an internal brand so arbitrary look-alike objects cannot enter
the renderer. `strings` identity can be cached in the browser with a `WeakMap` because the same
tagged-template expression reuses its `TemplateStringsArray` object.

### Proposed component options

Keep configuration declarative and small:

```ts
@Component({
  selector: "dota-counter",
  shadow: true,
  rendering: {
    engine: "template",
    hydration: "auto",
    mismatch: "recover",
    initial: "eager",
  },
})
export class CounterElement extends BaseElement {
  // ...
}
```

Suggested option meanings:

| Option | Values | Meaning |
| --- | --- | --- |
| `engine` | `"string" \| "template"` | Select legacy replacement or structured part patching |
| `hydration` | `"off" \| "auto" \| "required"` | Ignore existing DOM, adopt when marked, or fail if it cannot be adopted |
| `mismatch` | `"recover" \| "throw"` | Replace this component root or surface a hydration error |
| `initial` | `"eager" \| "outlet" \| ViewportPolicy` | Mount now, let another owner manage children, or opt into deferred mount |

The runtime default should be configurable at bootstrap. Component metadata should contain only
overrides. This avoids repeating four options on every class and makes framework-wide policy
changes testable.

### Simple component example

```ts
@Component({
  selector: "dota-counter",
  rendering: {engine: "template", hydration: "auto"},
})
export class CounterElement extends BaseElement {
  @State()
  count = 0;

  @BindEvent({event: "click", id: "button"})
  increment(): void {
    this.count += 1;
  }

  render(): TemplateResult {
    return html`
      <button type="button">
        Count: ${this.count}
      </button>
    `;
  }
}
```

On the first client mount, the template engine creates the button and records the text part.
When `count` changes, the next result has the same `strings` identity. Dota compares only the
text part's previous value and next value, then sets that text node. The button object is not
recreated, and the delegated listener remains attached to the stable render root.

## Render engine contracts

### Common engine boundary

```ts
export interface RenderEngine<TOutput extends RenderOutput = RenderOutput> {
  readonly kind: string;
  supports(output: RenderOutput): output is TOutput;
  mount(context: RenderContext, output: TOutput): RenderInstance;
  update(
    context: RenderContext,
    instance: RenderInstance,
    output: TOutput,
    changes: ChangeSet,
  ): CommitResult;
  dispose(instance: RenderInstance): void;
}

export interface RenderContext {
  readonly host: BaseElement;
  readonly root: HTMLElement | ShadowRoot;
  readonly definition: ComponentDefinition;
}
```

The renderer owns its `RenderInstance`. The runtime treats that object as opaque. This lets the
template renderer change its marker or part implementation without changing `BaseElement`.

### Commit result

A commit should return a small result that describes its observable outcome:

```ts
export type CommitKind = "mount" | "hydrate" | "patch" | "replace" | "noop";

export interface CommitResult {
  readonly kind: CommitKind;
  readonly changedParts: number;
  readonly replacedNodes: number;
  readonly recoveredFromMismatch?: boolean;
}
```

Production results should not require collecting every patch operation. Detailed operation logs
can be enabled only by a diagnostics build or benchmark. The result makes lifecycle hooks,
tests, performance reports, and future developer tools precise: `DOM_UPDATED` no longer has to
mean “the complete DOM was replaced.”

### `StringRenderEngine`: compatibility strategy

The string engine preserves existing behavior:

1. call the component's existing `render()`;
2. compare with the previously committed string;
3. return `noop` if the strings are exactly equal;
4. otherwise replace the selected root's `innerHTML`;
5. report `replace` and refresh structure-dependent bindings.

Exact equality is a safe optimization for client-rendered legacy output. It is **not** a
hydration check. Browser parsing normalizes markup, and semantically equivalent DOM is not
guaranteed to serialize to the original input string.

### `TemplateRenderEngine`: primary new strategy

The template engine has three internal pieces:

1. `TemplateCompiler` converts static strings into one cached `TemplateDefinition`.
2. `TemplateInstance` owns the cloned or hydrated DOM and its live part references.
3. Part patchers compare a previous value with a next value and perform the smallest DOM write.

```text
html`<p class=${tone}>${message}</p>`
       |                 |
       attribute part    child/text part
```

The compiler parses the static shape once, inserts stable internal markers, and records paths to
dynamic positions. Mount clones a `HTMLTemplateElement.content` fragment. Update does not parse
the template again.

Official Lit documentation is useful precedent for this shape: its `html` tag returns a lazy
template description, and the same template expression can update efficiently instead of being
replaced. Dota should implement only the features it needs rather than reproducing Lit's entire
directive system. See the [Lit template API](https://lit.dev/docs/api/templates/) and
[template overview](https://lit.dev/docs/templates/overview/).

## Part and patch model

### Required first part types

| Part | Example | Patch operation |
| --- | --- | --- |
| Child text/value | `${this.count}` | update a text node or bounded child range |
| Attribute | `title=${this.title}` | `setAttribute` or remove according to a sentinel |
| Boolean attribute | `?disabled=${this.disabled}` | add/remove the attribute |
| DOM property | `.value=${this.value}` | assign the property without rewriting the element |
| Nested template | `${cardView(this.card)}` | update a nested template instance |
| Iterable | `${this.items.map(itemView)}` | positional child-part update |
| Keyed iterable | `${repeat(items, key, itemView)}` | create, remove, or move keyed ranges |

Event expressions do not need to be in the first release because Dota already has decorators and
stable root delegation. Keeping one event model during the renderer migration reduces risk.

### Value semantics must be explicit

The current `HTML` treats `null` and `undefined` as absent but serializes other values. Structured
templates need context-aware rules:

- child `null`, `undefined`, and `nothing` render no child content;
- child `0`, `false`, and `""` keep documented meanings;
- an attribute sentinel removes an attribute rather than writing `"undefined"`;
- boolean attributes use presence, not the strings `"true"` and `"false"`;
- property parts write JavaScript values directly;
- nested `TemplateResult` values remain structured rather than becoming `"[object Object]"`.

Add explicit sentinels instead of overloading every falsy value:

```ts
html`<button ?disabled=${this.pending}>${this.label ?? nothing}</button>`;
```

### Dynamic HTML must be an explicit escape hatch

In the current string API, every interpolation can become parsed markup. The structured API
should write primitive child values as text by default. Trusted markup should require an
explicitly named operation:

```ts
html`<article>${unsafeHTML(this.sanitizedArticle)}</article>`;
```

`unsafeHTML` must accept only a documented trusted/sanitized type or pass through a configured
policy. `innerHTML` is an injection sink, and Trusted Types can enforce that values pass through
a policy before reaching it. See the [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API).

This is both a security improvement and an architectural benefit: normal dynamic values no
longer need HTML parsing.

### Keyed lists are an explicit feature

Position-based list patching is sufficient for append-only or simple output. Reordering stateful
rows requires stable keys:

```ts
render(): TemplateResult {
  return html`
    <ul>
      ${repeat(
        this.users,
        user => user.id,
        user => html`<li><input type="checkbox"> ${user.name}</li>`,
      )}
    </ul>
  `;
}
```

The keyed patcher associates each key with a bounded DOM range. A reorder moves the existing
range instead of assigning a different user to the old row. This preserves uncontrolled input
state and nested custom-element identity. This matches the reason keyed-list APIs exist in
mature structured renderers; see the [Lit keyed list explanation](https://lit.dev/docs/templates/lists/).

Keys must be unique within one list update. Development builds should throw a useful duplicate
key error. Production behavior should remain deterministic.

### Component ownership boundary

A parent renderer owns:

- static nodes cloned from the parent's template;
- attributes and properties on nodes named by the parent's parts;
- dynamic child ranges between the parent's markers.

A parent renderer does not own the descendants rendered inside a child custom element's shadow
or light render root. If the parent keeps the same child host in the same keyed or static part,
the child's runtime and internal DOM survive the parent update.

This boundary is necessary for independent component scheduling and hydration.

### Hero section example: parent and child renders stay independent

`HeroSectionComponent` currently returns a string containing child hosts such as
`<orb-background>` and `<get-started-button>`:

```ts
render(): string {
  return HTML`
    <section>
      <orb-background orbit-count="7"></orb-background>
      <get-started-button></get-started-button>
    </section>
  `;
}
```

The current hero output has no interpolated component property or state; it is effectively a
static parent view after its initial connection. The nested components are still live because the
browser upgrades their host elements and their own runtimes render independently. A future dynamic
hero value (for example, an orbit count or theme class) would dirty only the hero runtime and follow
the comparison flow below.

The sequence is:

```text
HeroSection.render()
  -> parent output contains <orb-background> and <get-started-button>
  -> parent inserts/patches those host elements
  -> browser upgrades/connects each child host
  -> OrbBackgroundRuntime.render() and GetStartedButtonRuntime.render() run independently
```

On a later hero update, the renderer must keep two views of the world:

```text
previousParentOutput = last string returned by HeroSection.render()
nextParentOutput     = new string returned by HeroSection.render()
activeParentDom      = currently attached DOM, including child-owned changes
```

The comparison is `previousParentOutput` versus `nextParentOutput`, not
`activeParentDom` versus `nextParentOutput`. Comparing against attached DOM would incorrectly treat
the child's internal changes as parent changes and could overwrite child state. The parent renderer
parses or tokenizes the two parent outputs, matches the `<orb-background>` host by position/key and
marker, and then:

- patches only changed parent-owned attributes or siblings;
- keeps the existing `<orb-background>` and `<get-started-button>` nodes when their identity is
  stable;
- sets a changed child-host attribute through the DOM, allowing that child to receive its native
  `attributeChangedCallback()` and schedule its own update;
- never calls the child's `render()` directly;
- lets each child compare its own previous output with its own next output.

If the hero output changes from `orbit-count="7"` to `orbit-count="8"`, the parent performs one
attribute patch on the existing `<orb-background>` host. The child then decides whether that
attribute affects its own render. If the hero removes the host or changes its tag/key, the parent
intentionally removes the old child and inserts a new one; normal custom-element disconnect/connect
lifecycle then applies.

This is why `previousOutput` is part of `RenderInstance` and why a `CommitResult` must report
`patch`, `move`, `replace`, and `noop` separately. It also explains how the other improvements fit
together: signals and `ChangeSet` decide whether the hero needs another render, markers identify
parent-owned parts, the renderer patches only those parts, and lifecycle ownership keeps child
rendering independent.

## Why generic HTML diffing is not the main renderer

A generic string diff engine would:

```text
render complete next string
  -> parse next string into detached DOM
    -> compare current and next trees
      -> patch attributes, text, insertions, moves, and removals
```

This can preserve more DOM than full replacement, but it has unavoidable costs and ambiguity:

- it still builds the whole string;
- it still parses the whole next tree;
- it needs complex rules for namespaces, tables, forms, slots, SVG, scripts, and custom elements;
- it cannot know which values are stable keys unless Dota adds key markup;
- it can accidentally overwrite user-managed input or contenteditable state;
- it cannot reliably attach hydration parts without a shared template identity and markers.

Recommended position:

- structured part diffing is the production target;
- exact string equality is the first legacy optimization;
- an opt-in `DomDiffRenderEngine` may be prototyped for string-heavy components that cannot yet
  migrate;
- the prototype is accepted only if it preserves focus, selection, form state, nested custom
  elements, SVG namespaces, and lifecycle ordering under browser tests;
- hydration never depends on heuristic generic diffing.

## Better change detection

### One change record per field per batch

The current scheduler knows only that an update is needed. The next runtime should keep the first
previous value and latest current value for each changed field:

```ts
export type ChangeSource = "property" | "state" | "attribute" | "manual";

export interface ChangeRecord<T = unknown> {
  readonly name: PropertyKey;
  readonly previous: T;
  readonly current: T;
  readonly source: ChangeSource;
}

export interface ChangeSet {
  readonly size: number;
  has(name: PropertyKey): boolean;
  get(name: PropertyKey): ChangeRecord | undefined;
  entries(): IterableIterator<[PropertyKey, ChangeRecord]>;
}
```

For `count: 0 -> 1 -> 2` in one task, the commit sees one record: previous `0`, current `2`.
Synchronous watchers may still observe both meaningful assignments for compatibility. Render
hooks and patch diagnostics receive the coalesced change set.

If the final value becomes equivalent to the first value before the flush, the tracker may remove
that render change and avoid a render. Attribute mutation lifecycle records must remain separate
because consumers may intentionally observe each DOM attribute mutation.

### Property options

Evolve the property contract toward:

```ts
export interface PropertyOptions<T> {
  attribute?: string | false;
  default?: T;
  converter: AttributeConverter<T>;
  reflect?: boolean;
  hasChanged?: (next: T, previous: T) => boolean;
}

@Property({
  attribute: "count",
  converter: numberConverter,
  reflect: true,
  hasChanged: (next, previous) => !Object.is(next, previous),
})
count = 0;
```

Compatibility notes:

- the existing `{name, type, default}` form remains accepted during migration;
- current properties always reflect, so changing the default to `reflect: false` needs a major
  release or an explicit new decorator contract;
- `attribute: false` allows JavaScript-only object properties without JSON attribute traffic;
- conversion and reflection belong to `AttributeController`, not renderer code;
- a custom `hasChanged` must be cheap because it runs in a setter.

The new default comparer should be selected and locked by tests. `Object.is` avoids repeated
updates for `NaN` and distinguishes `0` from `-0`, but it differs from the current `!==` behavior.
Use it first as an explicit option; change the default only in a versioned API decision.

### State options

State should use the same change detector without exposing an attribute:

```ts
@State({hasChanged: shallowArrayChanged})
items: readonly Item[] = [];
```

Do not install deep proxies by default. They increase complexity, hide write cost, and make
ownership difficult. Prefer immutable assignment:

```ts
this.items = [...this.items, nextItem];
```

For controlled in-place mutation, provide an explicit escape hatch:

```ts
this.items.push(nextItem);
this.requestUpdate("items");
```

Official reactive-property guidance from Lit makes the same trade-off: reference mutation does
not trigger a normal property update, so immutable data or an explicit update request is needed.
See [reactive properties and change detection](https://lit.dev/docs/components/properties/).

### Signals and fine-grained invalidation

A signal is a small reactive cell that stores one value and notifies its subscribers when that value
changes. A writable signal usually exposes `get()` and `set()`; a computed signal derives a value
from other signals; an effect runs a side effect after a dependency changes. Signals are a
JavaScript/runtime pattern, not a native browser DOM API.

```ts
export interface Signal<T> {
  get(): T;
  subscribe(listener: () => void): () => void;
}

export interface WritableSignal<T> extends Signal<T> {
  set(next: T): void;
}

export function signal<T>(initial: T): WritableSignal<T>;
export function computed<T>(read: () => T): Signal<T>;
```

Example component state:

```ts
readonly count = signal(0);
readonly label = computed(() => `Count: ${this.count.get()}`);

render(): MarkupResult {
  return markup`
    <button data-dota-part="p0">${dynamic(this.label, this.label.get())}</button>
  `;
}
```

Signals reduce rendering in three related ways:

1. **They identify the cause of an update.** A signal subscription can mark only the owning
   component dirty, rather than making every component ask whether it might have changed.
2. **They coalesce repeated writes.** Several `set()` calls before the scheduler flush produce one
   render commit, while the signal retains its latest value.
3. **They enable part-level invalidation.** If a markup part records the signals read for that part,
   the renderer can skip unrelated parts and patch only the affected marker.

The third benefit requires an explicit association. Reading `this.count.get()` while evaluating one
large `render()` function can safely mark the component dirty, but it does not automatically prove
which interpolation used the value. The first implementation should therefore support both forms:

```ts
// Component-level invalidation: simple and always correct.
return markup`<output>${this.count.get()}</output>`;

// Part-level invalidation: explicit and more selective.
return markup`<output>${dynamic(this.count, this.count.get())}</output>`;
```

`dynamic` should accept a stable `SourceToken` in addition to a property name:

```ts
export type SourceToken = PropertyKey | Signal<unknown>;

export function dynamic<T>(source: SourceToken, value: T): T;
```

The runtime maps a signal notification to the component's `ChangeSet`, then the shared scheduler
coalesces the component's work. The `RenderingEngine` still compares the current part value before
writing the DOM, so a notification that recomputes to an equivalent value becomes a `noop`.

Signals should not replace lifecycle, ownership, or the renderer:

- `Signal` owns value and dependency notification.
- `ChangeSet` owns the batch's previous/current values and compatibility metadata.
- `UpdateScheduler` owns ordering and one-commit-per-batch behavior.
- `RenderingEngine` owns markup comparison and DOM patches.
- lifecycle effects (`sync`, `pre`, and `post`) own side effects and cleanup.

Do not use deep proxies or subscribe every component to every signal by default. Prefer explicit
signal reads, stable `SourceToken` metadata, and disposal of subscriptions when a component
disconnects. A signal that is read during a deferred or offscreen render must not force DOM work
until the component becomes eligible; its latest value is applied during the eventual mount or
hydration commit.

Signals are an optional enhancement to the existing property/state API, not a required rewrite.
Properties can publish signal-style invalidations internally, allowing legacy decorators and new
signal-backed state to share the same `ChangeSet` and scheduler.

### Watchers and effects

Do not silently change watcher timing in the extraction. Existing watchers execute synchronously
for every meaningful mutation, and some can call `updateHTML()` to flush immediately.

Longer term, introduce a separate effect API rather than overloading `@Watcher`:

```ts
@Effect({on: ["query"], flush: "post"})
focusResults(): void {
  this.resultsElement.focus();
}
```

Possible phases are:

- `sync`: immediately after value storage, matching current watcher timing;
- `pre`: once per batch before render;
- `post`: once after a successful mount, patch, or hydration commit.

Existing `@Watcher` maps to `sync` until a major release says otherwise.

## Update scheduler API

### Shared scheduler, independent component state

Today every dirty component queues its own microtask. A shared environment scheduler can use one
microtask and an insertion-ordered `Set<ComponentRuntime>`:

```ts
export interface UpdateScheduler {
  request(runtime: ComponentRuntime): void;
  cancel(runtime: ComponentRuntime): void;
  flush(runtime: ComponentRuntime): CommitResult | undefined;
  flushAll(): readonly CommitResult[];
}
```

Conceptually:

```ts
request(runtime): void {
  this.pending.add(runtime);
  if (this.flushQueued) return;

  this.flushQueued = true;
  queueMicrotask(() => this.performFlush());
}
```

`queueMicrotask()` does not cancel earlier callbacks. Deduplication comes from the `Set` and the
single `flushQueued` gate. A synchronous `flush(runtime)` removes that runtime from the set and
commits it immediately. The later queued flush sees that it is no longer pending.

### Ordering rules

The first shared scheduler should preserve request order because it is deterministic and cheap.
Before committing a runtime, it must verify the connection generation and mount state. If a
legacy parent replacement disconnected a queued child, the child update is skipped.

A parent-before-child or frame-budget scheduler can be added as another strategy only after
benchmarks justify its sorting or bookkeeping cost. Structured patching already removes most
parent-destroys-child cases, so topology sorting should not be assumed to be free.

### Public update methods

Recommended public meanings:

| API | Meaning |
| --- | --- |
| `requestUpdate(name?, previous?)` | Mark the component dirty and schedule a coalesced update |
| `flushUpdate()` | Perform this component's pending update synchronously |
| `updateComplete` | Promise for this component's current scheduled commit |
| `updateHTML()` | Deprecated compatibility alias for `flushUpdate()` while string consumers migrate |

`updateComplete` should resolve for the component's own commit, not its entire descendant tree.
This keeps the contract bounded. Mature reactive renderers use a similar component-local promise;
see the [Lit update lifecycle](https://lit.dev/docs/components/lifecycle/).

## Property and attribute controller

`PropertyUtils` currently combines reflection markers, conversion, initial-value precedence,
accessor installation, runtime attribute assignment, and watcher execution. Split those concerns
behind one coherent instance controller rather than multiple static calls:

```ts
export interface ReactiveController {
  initialize(host: BaseElement, definition: ComponentDefinition): void;
  setProperty(name: PropertyKey, value: unknown, source: ChangeSource): boolean;
  attributeChanged(name: string, value: string | null): PropertyKey | undefined;
  disconnect(): void;
}
```

Internally it may collaborate with an `AttributeConverter` and `AttributeReflector`, but those
do not need separate public classes unless consumers can replace them.

Reactive mutation timing remains explicit and synchronous before scheduling:

```text
JavaScript property assignment
  -> compare old and new values
  -> store the new value
  -> reflect the attribute immediately when configured
  -> run compatible synchronous watchers
  -> record the change and request one update

External attribute mutation
  -> browser calls attributeChangedCallback
  -> ignore property-reflection re-entry or convert the external value
  -> store the converted value
  -> run compatible synchronous watchers
  -> record the change and request one update
```

This preserves the current guarantee that reflected attributes are visible immediately, before
the scheduled DOM commit. The scheduler batches rendering; it does not delay property storage,
attribute reflection, or synchronous watchers.

Initialization needs two deliberate modes. The Phase 2 legacy extraction preserves the current
ordering so it does not hide a behavior change inside a refactor. Structured mount and hydration
prepare reactive storage before producing the first `TemplateResult`, with update scheduling and
watchers suppressed during seeding. For client-only mount, configured initial reflection may then
run without scheduling a second render. For hydration, serialized attributes should already match
the selected state; a required hydration reports a missing/conflicting reflected value, while a
recovery policy may reconcile it after choosing local recovery. Hydration must not mutate the DOM
first and then claim that the original markup matched.

Required behavior:

1. preserve initial precedence: markup attribute, then pre-upgrade JavaScript property, then
   decorator default;
2. install or activate accessors before the first structured render or hydration binding;
3. seed initial values without scheduling an update;
4. distinguish external attribute changes from framework reflection;
5. record change source and previous/current values;
6. reflect only when the property definition requests it;
7. never serialize internal state to an attribute;
8. handle removed attributes through a documented converter/default policy;
9. preserve synchronous watcher behavior during compatibility phases;
10. stop using the public `reactive` boolean as cross-class coordination state.

## Render root controller

```ts
export interface RenderRootController {
  resolve(host: BaseElement, definition: ComponentDefinition): RenderRootResult;
}

export interface RenderRootResult {
  readonly root: HTMLElement | ShadowRoot;
  readonly origin: "light" | "existing-shadow" | "created-shadow";
}
```

Resolution rules:

1. Light-DOM component: use the host.
2. Shadow component with `host.shadowRoot`: adopt it; do not call `attachShadow()`.
3. Shadow component without a root: call `attachShadow()` once with immutable definition
   options.
4. Reconnect: reuse the stored/live root and never attach a second time.
5. Hydration `required`: report a missing expected declarative root rather than silently hiding
   the mismatch.

Declarative Shadow DOM uses `<template shadowrootmode="open">`; during HTML parsing the template
is replaced by a `ShadowRoot` attached to its parent. See the
[`<template>` reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template#declarative_shadow_dom).

## Hydration architecture

### Hydration is attachment, not replacement

Hydration means:

1. the browser has already parsed useful DOM;
2. Dota identifies which compiled template produced it;
3. Dota connects template parts to the existing nodes;
4. Dota installs behavior and element references;
5. later reactive updates use the normal patch engine.

A matching hydration must not assign `innerHTML`, clone the template, or recreate child custom
elements.

### Client contract

```ts
export interface HydrationEngine {
  inspect(context: RenderContext, output: TemplateResult): HydrationInspection;
  hydrate(
    context: RenderContext,
    output: TemplateResult,
    inspection: HydrationInspection,
  ): HydrationResult;
}

export type HydrationResult =
  | {kind: "hydrated"; instance: RenderInstance; changedParts: 0}
  | {kind: "not-marked"}
  | {kind: "mismatch"; reason: HydrationMismatch};
```

Keep `HydrationEngine` separate from `TemplateRenderEngine` because inspection, marker versions,
mismatch reporting, and server compatibility can grow independently. Both must consume the same
`TemplateDefinition` and produce the same `RenderInstance` shape.

### Required server/build markers

Do not attempt to hydrate arbitrary HTML by comparing `innerHTML`. The server/build serializer
and client compiler need a shared contract containing:

- a stable template ID or build-generated hash;
- a marker format version;
- bounded markers for dynamic child ranges;
- deterministic locations for attribute/property parts;
- keyed list identities where applicable;
- enough component boundary information to recover locally.

Illustrative output:

```html
<dota-counter data-dota-template="counter:4c3a" data-dota-markers="1">
  <button type="button">
    Count: <!--dota:p0-->0<!--/dota:p0-->
  </button>
</dota-counter>
```

The exact marker syntax needs a prototype and HTML-parser tests. It should be compact, valid in
table/SVG-sensitive contexts, and removable only if the patcher no longer needs it. A client-side
`TemplateStringsArray` identity is not enough across server and browser JavaScript realms, so a
stable generated identity is required for hydration.

### Hydration sequence

For a marked component:

```text
custom element upgrades
  -> ComponentRuntime connects
    -> compile/read ComponentDefinition
    -> initialize property and state storage without reflection writes
    -> RenderRootController adopts light DOM or existing ShadowRoot
    -> component produces the matching TemplateResult
    -> HydrationEngine validates template ID and markers
    -> create live part references over existing nodes
    -> ViewBindingController binds delegation and @Element references
    -> publish hydrated/connected lifecycle
```

For a shadow component, server output uses declarative shadow DOM:

```html
<dota-user-card data-dota-template="user-card:a917">
  <template shadowrootmode="open">
    <article>
      <h2><!--dota:p0-->Ada<!--/dota:p0--></h2>
    </article>
  </template>
</dota-user-card>
```

The HTML parser creates the shadow root before upgrade. Dota adopts `host.shadowRoot` and binds
the existing marker range.

### Mismatch policy

Mismatch is expected during deploy skew, stale caches, changed feature flags, locale differences,
or nondeterministic rendering. It needs an explicit policy.

`mismatch: "throw"`:

- intended for tests, development, and `hydration: "required"`;
- reports selector, expected template ID, actual ID, marker/path, and a short reason;
- leaves evidence available instead of hiding the bug.

`mismatch: "recover"`:

- disposes any partially attached part state;
- replaces only this component's render root with a fresh client mount;
- records `recoveredFromMismatch: true` in the commit result;
- never replaces an ancestor page solely because one leaf mismatched.

Recovery must not run twice for the same connection generation.

### Server/build rendering is a separate entry point

`BaseElement` extends `HTMLElement`, and existing `render()` methods frequently read instance and
browser state. A Node server should not construct component elements just to obtain HTML.

Prefer view functions that can run independently:

```ts
export const counterView = (model: {count: number}): TemplateResult => html`
  <button type="button">Count: ${model.count}</button>
`;

export class CounterElement extends BaseElement {
  @State()
  count = 0;

  render(): TemplateResult {
    return counterView(this);
  }
}

// Separate @ayu-sh-kr/dota-core/server entry point
renderToString(counterView({count: 0}));
```

An initial rollout may use build-time browser prerendering if that matches the current toolchain,
but the serialized output must still come from the same template definition and marker version.
The client hydration API can ship before a full request-time SSR framework, provided fixtures or
build output can generate valid marked DOM.

Lit Labs describes hydration similarly: it reassociates template expressions with existing nodes
and listeners, then later renders update those nodes efficiently. Its current SSR client package
is experimental, so it is precedent, not a dependency or stability guarantee. See
[Lit SSR client usage](https://lit.dev/docs/ssr/client-usage/).

## View binding controller

### Delegated events

The P4 implementation correctly moved view events to a stable root. The next extraction should
compile all bindings for one event into one root listener:

```text
Current improved form: one root listener per decorator binding
Target form:           one root listener per event type with a routing table
```

`ViewBindingController` owns that routing table, uses `composedPath()` for supported composed
events, and detaches listeners on disconnect. Template patches do not trigger rebinding because
the root remains stable.

### `@Element` references

Full replacement currently requires every query to run after every update. Structured patching
changes that rule:

- resolve all `@Element` references after mount or hydration;
- keep the reference when a patch changes only text, attributes, or properties;
- if a conditional or list patch changes structure containing a queried target, re-resolve only
  affected queries if dependency information is available;
- the first implementation may re-resolve all queries only after a **structural** patch, which is
  still much cheaper than every state update;
- clear references on disconnect only if the existing public contract requires it.

Tests must change their expectation for patch-mode components: a stable queried node should be
the same object before and after a text update. Legacy string-mode tests continue expecting a new
node after replacement.

### Host and global resources

Host, window, document, application, and class-scoped application listeners are connection
resources. Group them under a `ConnectionBindingController` or a small set of existing meaningful
event managers. They bind once per connection and unbind once per disconnect. They do not belong
to render-engine mount or patch code.

## Lifecycle contract

### Separate browser connection, view readiness, and updates

Recommended phases:

```text
constructed
  -> connected-unmounted
    -> mounting
      -> mounted or hydrated
        -> updating -> mounted/hydrated
  -> disconnected
```

Legacy lifecycle compatibility:

- `@BeforeInit` runs after native host connection but before mount/hydration;
- `@AfterInit` and `CONNECTED` run only after view bindings and references are ready;
- `ATTRIBUTE_CHANGED` preserves the current post-commit ordering for queued runtime changes;
- `DOM_UPDATED` remains as a compatibility event after a non-initial commit, but receives a
  `CommitResult` so consumers can distinguish patch, replace, and no-op;
- `DISCONNECTED` runs after connection resources are released;
- reconnect is a new connection generation and never duplicates listeners.

A `noop` is still a completed update cycle. In legacy compatibility mode, an explicit update that
would currently emit `DOM_UPDATED` continues to emit it, with `{kind: "noop"}` in the commit
result, even though no DOM mutation occurred. This keeps completion notification separate from
the amount of DOM work.

Proposed protected hooks for new code:

```ts
protected willMount(): void {}
protected mounted(result: CommitResult): void {}
protected hydrated(result: CommitResult): void {}
protected shouldUpdate(changes: ChangeSet): boolean { return true; }
protected willUpdate(changes: ChangeSet): void {}
protected updated(changes: ChangeSet, result: CommitResult): void {}
protected unmounted(): void {}
```

Do not require applications to use every hook. They are named lifecycle extension points so
consumers no longer need to override native callbacks or call private bind methods.

### Update order

For one scheduled update:

```text
take immutable snapshot of ChangeSet
  -> shouldUpdate(changes)
  -> willUpdate(changes)
  -> property values and configured reflection are already current
  -> call render()
  -> renderer returns patch/replace/noop CommitResult
  -> refresh structurally affected @Element references
  -> emit queued attribute lifecycle records
  -> run post effects
  -> updated(changes, result)
  -> resolve updateComplete
  -> emit DOM_UPDATED when compatibility rules require it
```

Mutations during `render()` must have a written rule. The simplest safe rule is to include them in
the active change set when possible and schedule another update only when a value changes after
the renderer commit begins. Add loop detection and a development error for an update cycle that
cannot settle.

## Render policy integration

Initial render policy should use the runtime state machine, not live inside a renderer:

- `eager`: runtime immediately mounts or hydrates;
- `outlet`: runtime establishes connection resources but never owns child rendering;
- `viewport`: runtime remains `connected-unmounted` until a shared coordinator marks it eligible.

When a viewport component becomes eligible, it uses the same mount-or-hydrate operation as an
eager component. Property changes before eligibility update storage and one dirty set; they do
not create repeated render callbacks.

Offscreen update gating is also a scheduler eligibility policy. It should not change property,
attribute, watcher, or application-event semantics. See the dedicated
[startup rendering and viewport deferral plan](./base-element-startup-render-deferral-plan.md)
for accessibility, intrinsic-size, hash-navigation, and observer requirements.

## Suggested source layout

This layout groups cohesive behavior without requiring one class per file if small related types
are clearer together:

```text
packages/libs/dota-core/src/core/
  elements/
    base-elements.ts                 # native adapter and public hooks
  runtime/
    component-runtime.ts             # per-instance orchestration/state machine
    runtime-environment.ts           # service composition and defaults
    component-definition.ts          # immutable compiled plan
    component-definition-compiler.ts
  reactivity/
    reactive-controller.ts           # property/state accessors and changes
    change-set.ts
    attribute-converter.ts
  scheduling/
    update-scheduler.ts
    microtask-update-scheduler.ts
  rendering/
    render-output.ts
    render-engine.ts
    commit-result.ts
    render-root-controller.ts
    string-render-engine.ts
    template/
      template-result.ts
      template-compiler.ts
      template-instance.ts
      parts.ts                       # keep related small part types together first
      repeat.ts
  hydration/
    hydration-engine.ts
    marker-hydrator.ts
    hydration-mismatch.ts
  binding/
    view-binding-controller.ts
    connection-binding-controller.ts
  lifecycle/
    lifecycle-dispatcher.ts
```

Do not expose every file from the root barrel. Suggested package exports after contracts stabilize:

```json
{
  "exports": {
    ".": "...component author API...",
    "./rendering": "...advanced renderer contracts...",
    "./runtime": "...bootstrap/runtime composition...",
    "./server": "...pure template serialization only..."
  }
}
```

This supports **pay for play**: legacy consumers do not need to include hydration diagnostics,
server serialization, keyed-list helpers, or an optional generic diff engine in every browser
bundle. Package builds must verify that subpath design actually tree-shakes before claiming a
bundle improvement.

## API compatibility and migration

### Compatibility matrix

| Existing behavior/API | Migration decision |
| --- | --- |
| `render(): string` | Continue through `StringRenderEngine` |
| Uppercase `HTML` returns string | Keep unchanged during compatibility releases |
| Direct `updateHTML()` is synchronous | Keep as deprecated alias to `flushUpdate()` |
| `@Property({name, type, default})` | Normalize into new property definition |
| Properties always reflect | Preserve in legacy option normalization |
| `@State()` | Add optional config without breaking the no-argument form |
| Watchers run synchronously per mutation | Preserve; add a separate effect API later |
| `@BindEvent` survives replacement | Move implementation to view binding controller |
| `@Element` changes identity after string replacement | Preserve in string mode; stabilize in template mode |
| `CONNECTED` means view is ready | Preserve for eager, hydrated, and deferred mount paths |
| `DOM_UPDATED` after explicit update | Preserve; include commit details |
| `bootstrap(elements)` | Keep default runtime; add optional environment argument |

### Do not silently convert string templates

Automatic conversion of `HTML` strings into structured templates is unsafe because existing code
can:

- concatenate fragments;
- join arrays;
- interpolate already-rendered strings as markup;
- return Markdown-produced HTML;
- build tags or attribute names dynamically;
- depend on unescaped interpolation.

Migration should be explicit per component. A codemod may change simple templates from `HTML` to
`html`, but it must flag dynamic tag names, raw HTML, string helper returns, and nested arrays for
manual review.

### Example migration

Before:

```ts
render(): string {
  return HTML`
    <section class="${this.tone}">
      ${this.items.map(item => HTML`<p>${item.label}</p>`).join("")}
    </section>
  `;
}
```

After:

```ts
render(): TemplateResult {
  return html`
    <section class=${this.tone}>
      ${this.items.map(item => html`<p>${item.label}</p>`)}
    </section>
  `;
}
```

If item identity matters:

```ts
${repeat(this.items, item => item.id, item => html`<p>${item.label}</p>`)}
```

The new version does not call `.join("")`; nested templates remain values the renderer can mount
and patch.

## Concrete markup and rendering-engine API

### The problem this solves

`render()` describes the DOM owned by one component. It does not call `render()` on nested custom
elements. The browser creates those child elements from the returned markup, and each child runtime
renders itself when it connects. Therefore the parent must not compare its next output with the
entire attached DOM: a child may have already replaced or patched its own internal DOM.

The parent keeps a separate previous-output snapshot and compares **previous parent output** with
**next parent output**. It uses the attached DOM only as the place where approved parent-owned
patches are applied. Child custom-element hosts are identity boundaries: if the host tag and key are
unchanged, the parent preserves the host and never descends into the child's rendered DOM.

This separates three responsibilities:

| Responsibility | Owner | Why it exists |
| --- | --- | --- |
| Decide whether an update is needed | properties, signals, `ChangeSet`, scheduler | avoid calling `render()` for unrelated work |
| Decide what parent output changed | `RenderingEngine` and part/node comparison | avoid replacing the whole parent subtree |
| Render a nested custom element | the child `ComponentRuntime` | preserve independent lifecycle and ownership |

The browser remains responsible for parsing HTML and creating DOM nodes; Dota owns output snapshots,
template identity, dependency metadata, comparison policy, and patch scheduling.

### What the browser provides and what Dota owns

There is no cross-browser `DOM.diff()` or `DOM.patch()` API. Browser APIs provide the primitives
needed to implement one: element queries, `Range` for bounded child replacement, and ordinary DOM
operations for attributes, properties, insertion, and removal. `Node.isEqualNode()` can answer a
narrow equality question, but it does not report a change set. `MutationObserver` reports mutations
after they happen, so it is useful for diagnostics and external-mutation detection, not for planning
component updates.

This means Dota should not write a complete HTML parser or attempt to infer a perfect diff from
arbitrary strings. The markup tag should emit stable element markers, and the browser should parse
the resulting HTML. Legacy strings may use `DOMParser` as a compatibility bridge, but they cannot
provide reliable property dependencies or hydration markers.

### Markup API

The public author API should be a tagged template with explicit dynamic values:

```ts
export type RenderOutput = string | MarkupResult | typeof noView;

export interface MarkupResult {
  readonly kind: "dota-markup";
  readonly template: MarkupTemplate;
  readonly values: readonly unknown[];
}

export interface MarkupTemplate {
  readonly id: string;
  readonly markerVersion: number;
  readonly parts: readonly MarkupPartDefinition[];
}

export function markup(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): MarkupResult;

export function dynamic<T>(source: PropertyKey, value: T): T;
```

Example:

```ts
render(): MarkupResult {
  return markup`
    <button class=${dynamic("tone", this.tone)}
            ?disabled=${dynamic("busy", this.busy)}>
      ${dynamic("label", this.label)}
    </button>
  `;
}
```

Static template strings determine template identity and shape. Values remain separate from strings,
so the renderer can update one text, attribute, property, or child range without re-parsing the
whole result. Authors should not write marker attributes manually; the tag/compiler derives them.

The marker can be emitted directly on an element and queried with standard browser APIs:

```html
<button data-dota-part="p0" data-dota-template="profile-card:v1">
  <span data-dota-part="p1">Ada</span>
</button>
```

`querySelectorAll('[data-dota-part]')` can then bind the active parts during mount or hydration.
The renderer should treat these attributes as reserved and remove them after hydration only if the
component does not need them for later recovery. A host-level `data-dota-template` marker is useful
for identifying the compiled template; a part marker identifies an element, not an arbitrary text
node.

Element markers are therefore the default for element attributes, properties, and child containers.
For a text value that must remain a direct text child, there are two choices: use a comment/range
anchor, or use a generated wrapper such as `<span data-dota-part="p2"></span>`. The wrapper is easy
to query but changes layout, semantics, accessibility, and CSS behavior. The recommended default is
element markers for element parts and comment/range anchors only where a wrapper would be observable;
an implementation may choose all-element markers when its component contract permits wrappers.

Supported contexts should be deliberately small: text/child interpolation, attributes,
boolean attributes, explicit properties (`.value`), nested templates, and keyed iterables through
`repeat(items, key, template)`. Event handlers remain under the existing event/view-binding
controller; do not rebind function listeners on every render.

### Static/dynamic markup metadata

The internal AST is immutable template metadata, not a second live DOM. A useful internal shape is:

```ts
export type MarkupNode =
  | { readonly kind: "element"; readonly tagName: string; readonly namespace?: string; readonly children: readonly MarkupNode[] }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "comment"; readonly value: string }
  | { readonly kind: "part"; readonly partId: number; readonly partKind: MarkupPartKind };

export type MarkupPartKind =
  | "text" | "attribute" | "boolean-attribute" | "property"
  | "child-range" | "template" | "iterable" | "keyed-iterable";

export interface MarkupPartDefinition {
  readonly id: number;
  readonly kind: MarkupPartKind;
  readonly path: readonly number[];
  readonly sources: readonly PropertyKey[];
  readonly marker?: string;
  readonly name?: string;
}
```

Keep the detailed AST private. Expose `MarkupTemplate` and part definitions, but do not promise a
node-by-node AST shape that would prevent compiler changes. The runtime may resolve a part by its
`data-dota-part` marker instead of a path. Paths remain a fallback for marker-free production output
and for static nodes that are cheaper to address directly. Range parts may use paired element markers
or comment anchors; the choice belongs to the renderer policy, not to component authors.

Automatic getter tracking is not required initially. By the time a tag function receives
`this.count`, the getter has already run and cannot be associated with one interpolation without a
compiler transform. Explicit source metadata is predictable; component-level `ChangeSet` remains
the correctness fallback.

### RenderingEngine contract

`ComponentRuntime` owns one engine instance. `BaseElement` delegates lifecycle and update work to the
runtime; it does not know how templates are mounted or patched.

```ts
export interface RenderingEngine<TOutput extends RenderOutput = RenderOutput> {
  readonly kind: string;
  supports(output: RenderOutput): output is TOutput;
  mount(context: RenderContext, output: TOutput): RenderInstance;
  update(instance: RenderInstance, output: TOutput, changes: ChangeSet): CommitResult;
  hydrate(context: RenderContext, output: TOutput): HydrationResult;
  dispose(instance: RenderInstance): void;
}

export interface RenderInstance {
  readonly root: HTMLElement | ShadowRoot;
  readonly templateId?: string;
  readonly parts: readonly ActiveMarkupPart[];
  readonly lastOutput: RenderOutput;
}

export type CommitKind = "mount" | "hydrate" | "patch" | "replace" | "noop";

export interface CommitResult {
  readonly kind: CommitKind;
  readonly changedParts: number;
  readonly insertedNodes: number;
  readonly removedNodes: number;
  readonly movedNodes: number;
  readonly replacedNodes: number;
  readonly recoveredFromMismatch?: boolean;
}
```

The hot path should compare and patch parts while walking them instead of allocating a complete
diff tree on every update. A separate diagnostic API can expose the same decisions for tests and
instrumentation.

### Node comparison and patch API

The required pure function for tests and diagnostics is:

```ts
export interface NodeDiff {
  readonly kind: "same" | "replace" | "text" | "attributes" | "children";
  readonly path: readonly number[];
  readonly changes?: readonly NodeChange[];
}

export function diffNodes(
  previous: Node,
  next: Node,
  options?: NodeDiffOptions,
): NodeDiff;
```

Production should use a streaming visitor so a large tree does not create a second full change tree:

```ts
export interface NodePatchVisitor {
  onText(path: readonly number[], current: Text, next: Text): void;
  onAttribute(path: readonly number[], name: string, oldValue: string | null, newValue: string | null): void;
  onInsert(path: readonly number[], node: Node): void;
  onRemove(path: readonly number[], node: Node): void;
  onMove(path: readonly number[], key: PropertyKey, fromIndex: number, toIndex: number): void;
  onReplace(path: readonly number[], current: Node, next: Node): void;
}

export function compareAndPatch(
  current: Node,
  next: Node,
  visitor: NodePatchVisitor,
  options?: NodeDiffOptions,
): PatchResult;
```

Comparison rules:

- Different node type, namespace, or tag name replaces only that subtree.
- Equal elements compare attributes and declared parts; live properties change only through an
  explicit property part.
- Text and comment data update in place.
- Children are positional by default. Keyed movement exists only through `repeat` or an explicit key;
  the renderer must not guess keys from arbitrary attributes.
- A surviving custom-element host is an ownership boundary. Its internal DOM is patched by its own
  runtime, not by its parent.
- Focus, selection, form values, media state, and scroll state are preserved unless explicitly
  changed by a property part.
- Use `Element.moveBefore()` for keyed moves when available; fall back to `insertBefore()` because
  `moveBefore()` is not yet Baseline.

### Update and hydration flow

```text
render()
  -> MarkupResult { template, values, source metadata }
  -> RenderingEngine.update(instance, output, ChangeSet)
     -> template id differs: controlled replace/mount fallback
     -> same template: iterate part definitions
        -> source clean: skip
        -> source dirty and value changed: patch only that part
        -> structural/keyed part: reconcile its child range
  -> rebind only affected view bindings
  -> return CommitResult and publish DOM_UPDATED
```

Hydration follows the same template and part definitions:

```text
upgrade
  -> resolve existing light DOM or declarative shadow root
  -> verify template id and marker version
  -> bind active parts to existing nodes
  -> do not write innerHTML or clone matching nodes
  -> perform the first update through the normal part patch path
```

A marker or template mismatch follows the configured `recover`, `warn`, or `throw` policy.
Recovery replaces only the component-owned boundary and reports `recoveredFromMismatch`.

### Lifecycle behavior during patches and replacements

Changing rendered output does not automatically reconnect the component. The callback behavior is
determined by which DOM identity the renderer preserves:

| Renderer operation | Existing component host | Nested custom elements | Native callback behavior |
| --- | --- | --- | --- |
| Patch text, class, or a property in place | preserved | preserved | no `connectedCallback()` or `disconnectedCallback()` |
| Set a changed observed attribute on an existing custom element | preserved | preserved | that element receives `attributeChangedCallback()` |
| Assign a property part (`.value`, `.open`) | preserved | preserved | `attributeChangedCallback()` does not run unless the setter reflects to an observed attribute |
| Replace a child node/range | parent preserved | removed children disconnect; inserted custom elements connect | `disconnectedCallback()` for removed elements, `connectedCallback()` for inserted elements |
| Move a keyed child without removing identity | parent and child preserved | preserved | no reconnect; use `moveBefore()` when available or `insertBefore()` fallback |
| Replace the component host boundary | old host destroyed | descendants may disconnect | old runtime disconnects/disposes; new host connects/upgrades |

For example, changing `class=${this.tone}` should call `setAttribute("class", next)` on the
existing element. It must not replace that element, so focus, local state, event bindings, and
custom-element identity remain intact. If the element observes `class`, the platform will deliver
`attributeChangedCallback()`; Dota must not separately simulate the same native callback.

Changing `.value=${this.value}` is different: it assigns the live property and does not invoke
`attributeChangedCallback()` by itself. If the property implementation reflects to an observed
attribute, the browser may then deliver an attribute callback. The runtime's `ChangeSet` and
component watcher are the framework-level notification; native attribute callbacks are the DOM
level notification. They must not be conflated or delivered twice.

Replacing a subtree is therefore a lifecycle operation, not merely a rendering detail. Before
removal, the renderer must release Dota-owned bindings for that subtree. The browser then invokes
`disconnectedCallback()` for removed custom elements. After insertion and upgrade, it invokes
`connectedCallback()` for newly connected custom elements. A renderer that replaces a node even
though its tag and key are unchanged will cause unnecessary disconnect/connect work and can lose
focus, form state, and component-local resources.

Hydration has a stricter rule: matching server-created nodes are adopted, not replaced. Existing
custom-element identity and lifecycle state must remain intact; only marker binding and targeted
value correction should occur. A mismatch may intentionally recover by replacing the owned
boundary, in which case the resulting disconnect/connect callbacks are expected and must be
reported in diagnostics.

The renderer should expose this distinction in `CommitResult` (`patch`, `move`, or `replace`) and
test it with lifecycle counters. A parent patch must prove that stable child custom elements do not
disconnect; a keyed removal/insertion must prove that only the affected children reconnect.

### Legacy strings and browser feature policy

`StringRenderEngine` remains a compatibility engine. It can parse trusted strings with
`DOMParser`, then use conservative subtree replacement. It must not claim fine-grained hydration or
property dependency support. New components should use `markup`.

### Why `<template>` is optional

`<template>` was included because it gives a convenient detached `DocumentFragment`: the browser
parses HTML without inserting it into the active document, and the fragment can be cloned or used as
the source for a replacement. That is useful for a renderer that builds a complete next subtree.
It is not required for the marker-based design proposed here.

With element markers, the renderer can:

1. render the tagged output into a detached container (or parse a trusted string with
   `DOMParser`);
2. query `[data-dota-part]` and the host template marker;
3. compare the new values with the active part records; and
4. update the existing elements directly, using `Range` only for structural child changes.

The implementation should therefore make `TemplateElement` a replaceable parsing strategy, not a
public requirement:

```ts
export interface MarkupParser {
  parse(output: MarkupResult): ParsedMarkup;
}

export interface ParsedMarkup {
  readonly root: ParentNode;
  readonly templateId: string;
  readonly parts: readonly ParsedMarkupPart[];
}
```

The default parser may use `<template>` for safety and speed, while a future parser may use another
browser-supported detached container. The public `RenderingEngine` and marker contract do not
depend on that choice.

| Browser API | Role | Policy |
| --- | --- | --- |
| DOM queries, `Range`, `DocumentFragment` | marker lookup and bounded patches | required baseline primitives |
| `<template>` | optional detached parser/cache | implementation strategy, not public API |
| `DOMParser.parseFromString` | legacy string bridge | trusted/sanitized input only |
| `Node.isEqualNode` | optional equality fast path | never the change-set API |
| `MutationObserver` | external mutation diagnostics | not a renderer diff mechanism |
| `CustomElementRegistry` | upgrade and ownership coordination | feature-detect where needed |
| Declarative Shadow DOM | server-created shadow root hydration | feature-detect; client-mount fallback |
| `Element.moveBefore` | state-preserving keyed moves | optional enhancement; `insertBefore` fallback |
| `Document.parseHTML`, `setHTML`, `setHTMLUnsafe` | newer parsing/sanitization helpers | not required for core diffing |
| View Transition API | animate an applied update | optional presentation layer, not a patcher |

### First implementation checklist

- [ ] Add `markup` and branded `MarkupResult` contracts.
- [ ] Compile static strings into immutable part metadata and emit reserved element markers.
- [ ] Resolve element parts with `querySelectorAll`; use wrappers or range anchors only when direct
  text/range addressing would otherwise be ambiguous or semantically unsafe.
- [ ] Add `dynamic(source, value)` and connect declared sources to `ChangeSet` filtering.
- [ ] Add optional `Signal`/`WritableSignal` contracts and dispose subscriptions on disconnect.
- [ ] Map signal notifications into the existing `ChangeSet` and shared scheduler before adding
  part-level signal subscriptions.
- [ ] Add benchmarks comparing property invalidation, component-level signals, and part-level signals.
- [ ] Store active part records in `RenderInstance` and move patch logic out of `BaseElement`.
- [ ] Implement text, attribute, boolean-attribute, property, and child-range patchers.
- [ ] Implement `diffNodes` as a pure reference API and `compareAndPatch` as the streaming hot path.
- [ ] Implement explicit keyed `repeat` ranges and move fallback behavior.
- [ ] Keep event/view binding updates in their own controller.
- [ ] Make hydration bind the same markers and use the same update path.
- [ ] Keep legacy strings on the compatibility engine with documented security constraints.
- [ ] Benchmark render calls, parsed templates, changed parts, DOM operations, node identity, and
  input/focus preservation before and after each phase.

## Implementation roadmap

### Phase 0 — Freeze evidence and contracts

Goal: make architectural extraction measurable and prevent accidental lifecycle changes.

Checklist:

- [ ] Record current Dota Core, UI, router, wrapper, and application test totals.
- [ ] Add real-browser fixtures for light DOM and shadow DOM connect, update, disconnect, and
  reconnect.
- [ ] Add a fixture with existing light DOM that proves legacy mode still replaces it.
- [ ] Add a declarative shadow DOM fixture that exposes the current clearing/attachment problem.
- [ ] Record focus, selection, input value, scroll position, and nested custom-element identity
  across a current full replacement.
- [ ] Record render calls, `innerHTML` writes, parsed/created nodes, lifecycle order, duration,
  memory where available, and bundle sizes.
- [ ] Inventory public `updateHTML`, `HTML`, property reflection, watcher, and lifecycle consumers.
- [ ] Write an API decision record for value semantics and the change-comparer default.

Exit criteria:

- browser fixtures reproduce the important current behavior;
- benchmark output separates render calls, DOM operations, and wall-clock time;
- compatibility rules in this document have named tests.

### Phase 1 — Extract immutable component definitions

Goal: remove repeated metadata interpretation without changing rendering.

Checklist:

- [ ] Add non-mutating metadata read APIs.
- [ ] Implement `ComponentDefinitionCompiler` and constructor `WeakMap` cache.
- [ ] Normalize current decorator shapes into read-only definitions.
- [ ] Precompute property lookups by public name and attribute.
- [ ] Group view event bindings by event type.
- [ ] Validate duplicate metadata once with useful errors.
- [ ] Keep inherited metadata behavior explicit and tested.
- [ ] Replace runtime `fetchOrCreate()` reads with definition reads.
- [ ] Benchmark instance creation with decorated and undecorated components.

Exit criteria:

- current public behavior and test results are unchanged;
- undecorated runtime reads allocate no metadata maps;
- the same definition object is reused by all instances of one class.

### Phase 2 — Extract the runtime with legacy rendering

Goal: make `BaseElement` a thin adapter while preserving byte-for-byte observable behavior.

Checklist:

- [ ] Add `RuntimeEnvironment` with a compatible default.
- [ ] Add per-instance `ComponentRuntime` and explicit connection phases.
- [ ] Move pending update and connection-generation state into the runtime.
- [ ] Move property/state setup into `ReactiveController`.
- [ ] Move root resolution into `RenderRootController`.
- [ ] Move existing replacement into `StringRenderEngine`.
- [ ] Move view and connection bindings into controllers.
- [ ] Move event publication into `LifecycleDispatcher`.
- [ ] Make synchronous setup methods return `void`; remove synthetic `Promise.all()` work.
- [ ] Keep `updateHTML()` behavior and event ordering compatible.
- [ ] Make shadow-root connection and reconnection idempotent.

Exit criteria:

- `BaseElement` contains native callbacks, public update methods, and hooks, not rendering internals;
- every existing string-rendering test passes without a component migration;
- browser lifecycle order matches the Phase 0 fixture;
- legacy performance does not regress outside the agreed noise/bundle budget.

### Phase 3 — Introduce `ChangeSet` and a shared scheduler

Goal: improve change visibility and make scheduling replaceable.

Checklist:

- [ ] Record first previous and latest current values per field.
- [ ] Keep attribute mutation records separate from render changes.
- [ ] Add `hasChanged` normalization to property and state definitions.
- [ ] Preserve current comparison by default in compatibility mode.
- [ ] Implement an insertion-ordered shared microtask scheduler.
- [ ] Make request, cancel, disconnect, reconnect, and synchronous flush generation-safe.
- [ ] Add `requestUpdate()`, `flushUpdate()`, and `updateComplete`.
- [ ] Map `updateHTML()` to the compatibility synchronous flush.
- [ ] Add `shouldUpdate`, `willUpdate`, and `updated` hooks with immutable change snapshots.
- [ ] Detect and report non-settling update loops in development.

Exit criteria:

- multiple components dirtied in one task use one scheduler callback;
- one component changed several times produces one commit and correct `ChangeSet`;
- a value changed back to its original value can no-op without losing required attribute events;
- synchronous watcher flush still prevents a duplicate scheduled commit.

### Phase 4 — Add the structured template compiler and mount path

Goal: mount `TemplateResult` output without changing existing string components.

Checklist:

- [ ] Add lowercase `html`, a branded `TemplateResult`, `nothing`, and attribute-removal semantics.
- [ ] Cache `TemplateDefinition` by static strings identity.
- [ ] Parse and compile static template structure once.
- [ ] Clone compiled template content on first mount.
- [ ] Implement child/text, attribute, boolean attribute, and property parts.
- [ ] Support nested templates and positional iterables.
- [ ] Keep normal dynamic child values as text, not raw markup.
- [ ] Define and test an explicit trusted `unsafeHTML` path.
- [ ] Reuse existing decorator-based delegated event behavior.
- [ ] Produce `mount`, `patch`, and `noop` commit results.
- [ ] Add development validation for invalid expression positions.

Exit criteria:

- legacy and template components can be siblings and nested in either direction;
- changing one text interpolation performs one text patch and no root replacement;
- changing one attribute performs only the necessary attribute mutation;
- unchanged values perform no DOM write;
- template cache reuse is verified across instances.

### Phase 5 — Add structural patching and keyed lists

Goal: preserve node identity during conditional and list updates.

Checklist:

- [ ] Implement bounded child ranges for conditional/nested content.
- [ ] Implement iterable insertion, removal, and positional update.
- [ ] Add `repeat(items, key, view)` keyed ranges.
- [ ] Detect duplicate keys in development.
- [ ] Preserve focus, selection, uncontrolled form values, and custom-element identity on moves.
- [ ] Re-resolve `@Element` only after relevant structural patches.
- [ ] Test SVG, table, slot, and nested shadow-component boundaries.
- [ ] Benchmark append, prepend, remove, reverse, and random reorder workloads.

Exit criteria:

- keyed reorder moves existing ranges rather than recreating rows;
- stable child custom elements do not disconnect during a parent patch;
- browser-owned state remains attached to the intended keyed item;
- no generic whole-tree diff is required.

### Phase 6 — Define and implement hydration markers

Goal: attach structured template instances to existing light and shadow DOM.

Checklist:

- [ ] Choose and version a stable template ID and marker format.
- [ ] Generate the same `TemplateDefinition` for serializer and client.
- [ ] Add marked light-DOM serialization fixtures.
- [ ] Add declarative shadow DOM serialization using `shadowrootmode`.
- [ ] Adopt `host.shadowRoot` without calling `attachShadow()` when it exists.
- [ ] Validate template ID, part count, marker nesting, expected node kind, and static anchors.
- [ ] Build a `TemplateInstance` over existing nodes without cloning or replacement.
- [ ] Bind delegated events and `@Element` references after parts attach.
- [ ] Add `off`, `auto`, and `required` hydration policies.
- [ ] Add local `recover` and diagnostic `throw` mismatch policies.
- [ ] Include mismatch details without serializing sensitive DOM content.
- [ ] Test nested parent/child hydration boundaries and deploy-version skew.

Exit criteria:

- matching light DOM hydrates with zero root `innerHTML` writes;
- matching declarative shadow DOM remains the same node tree after upgrade;
- the first reactive update after hydration uses normal part patching;
- one mismatched leaf recovers without replacing its ancestor component;
- required hydration fails visibly in development/tests.

### Phase 7 — Add server/build serialization

Goal: generate valid hydratable HTML from the same structured templates.

Checklist:

- [ ] Add a browser-free serializer under a separate `./server` entry point.
- [ ] Keep template marker and escaping rules shared with the client compiler.
- [ ] Support light DOM and declarative shadow DOM output.
- [ ] Document which directives/parts are server-renderable.
- [ ] Define event/property-only values that do not serialize to HTML.
- [ ] Add deterministic locale, time, random, and environment guidance.
- [ ] Test output by parsing in real browsers before hydration.
- [ ] Add versioned marker compatibility and deploy-skew tests.
- [ ] Verify the server entry does not import `HTMLElement`, `window`, or browser-only services.

Exit criteria:

- a pure view function serializes without a DOM global;
- parsed output hydrates in supported browsers;
- declarative shadow content paints before component JavaScript executes;
- client and server builds agree on template IDs and marker versions.

### Phase 8 — Pilot and migrate components

Goal: prove value on real Dota components before changing defaults.

Pilot selection:

- one small text/attribute component such as a badge or counter;
- one form or interactive component where node identity matters;
- one nested custom-element parent;
- one keyed list;
- one shadow component with declarative shadow DOM;
- one build-rendered route fragment.

Checklist:

- [ ] Migrate simple `HTML` templates to `html` manually first.
- [ ] Remove string `.join("")` from nested template arrays.
- [ ] Mark trusted raw Markdown/HTML boundaries explicitly.
- [ ] Add per-component browser correctness tests before benchmarking.
- [ ] Compare production bundle and route chunks, not only core gzip size.
- [ ] Compare mount, patch, hydration, and mismatch separately.
- [ ] Publish migration examples and unsupported-pattern diagnostics.
- [ ] Add a codemod only after manual migrations define reliable rules.

Exit criteria:

- pilots show fewer DOM writes and preserved identity on real interactions;
- no accessibility or event regression is found;
- migration guidance covers every pattern seen in the pilot set;
- bundle cost is understood and optional features remain pay-for-play.

### Phase 9 — Add render deferral on top of the runtime

Goal: reduce below-fold startup construction without coupling observers to render engines.

Checklist:

- [ ] Add `outlet` policy and remove the empty initial `app-root` write.
- [ ] Add shared viewport coordinator and explicit mount placeholders.
- [ ] Hold pre-mount changes in the runtime and render final state once.
- [ ] Prefer hydration/content visibility for meaningful searchable content.
- [ ] Add hash, focus, keyboard, accessibility, and find-in-page gates.
- [ ] Add optional offscreen visual commit gating only for suitable components.
- [ ] Measure startup DOM writes, DOM nodes, LCP, layout shifts, and long tasks.

Exit criteria are defined in the dedicated startup deferral plan and must remain separate from
template patch benchmark claims.

### Phase 10 — Versioned default and deprecation decision

Goal: decide whether structured rendering becomes the default in the next major release.

Checklist:

- [ ] Review migration coverage across app, UI, router, wrapper, and libraries.
- [ ] Decide whether `HTML` remains a supported legacy tag or is deprecated.
- [ ] Decide the new default property reflection and comparer behavior.
- [ ] Publish lifecycle and hydration compatibility tables.
- [ ] Add changesets and a major-version migration guide for breaking defaults.
- [ ] Keep legacy string engine in a separate import if long-term compatibility is required.

## Benchmark plan

### Measure operations before duration

Wall-clock results vary by hardware, browser, thermal state, and development tooling. Every
benchmark should record deterministic operation counts alongside duration:

- render calls;
- root `innerHTML` writes;
- text writes;
- attribute sets/removals;
- property writes;
- nodes created, removed, and moved;
- child custom-element connect/disconnect counts;
- `@Element` queries;
- scheduler callbacks;
- hydrated parts and mismatch recoveries.

### Required scenarios

| Scenario | Legacy expectation | Template/hydration target |
| --- | --- | --- |
| No-op update | Full replacement today | `noop`, zero DOM writes |
| One text value | Root replacement | one text/child-part write |
| One attribute value | Root replacement | one set/remove operation |
| Three fields in one task | one batched replacement | one batch, only changed parts |
| Input while unrelated label changes | input recreated | same input, selection/value preserved |
| Stable nested custom element | disconnect/reconnect | same host instance, no disconnect |
| Append 1 of 1,000 rows | recreate/parse all output | create one keyed range |
| Reverse keyed rows | recreate/parse all output | move existing keyed ranges |
| Matching hydration | current connection overwrites | zero root replacement, attach parts |
| Hydration mismatch | unsupported | one local recovery or diagnostic failure |
| Declarative shadow root | currently unsafe to adopt | same shadow root and nodes retained |

These are algorithmic targets, not claimed speed percentages. A performance claim is published
only after the implementation is measured in a real browser production build.

### Performance gates

- [ ] A one-part patch has fewer DOM mutations than legacy replacement.
- [ ] Matching hydration performs no root replacement.
- [ ] No-op updates perform no DOM mutation and emit only lifecycle behavior explicitly defined
  for no-op commits.
- [ ] Template compilation is reused by repeated instances.
- [ ] Scheduler and change tracking do not make legacy single-update performance materially worse.
- [ ] Patch-mode memory stabilizes after repeated updates and disconnects.
- [ ] Part markers and keyed maps are released on disposal.
- [ ] Optional diagnostics add no production hot-path allocation when disabled.
- [ ] Core, rendering, hydration, and server bundle contributions are reported separately.
- [ ] Low-end/mobile throttled runs show no new long task from a large batched flush.

## Required correctness matrix

### Rendering and DOM state

- [ ] Light DOM mount, patch, replacement, and no-op.
- [ ] Shadow DOM mount, patch, replacement, reconnect, and hydration.
- [ ] Text, attribute, boolean attribute, and property expressions.
- [ ] Nested templates, conditionals, empty values, and iterables.
- [ ] Keyed append, prepend, delete, swap, reverse, and duplicate key errors.
- [ ] SVG namespace and table parsing contexts.
- [ ] Slots and composed event paths.
- [ ] Focused inputs, text selection, uncontrolled values, contenteditable, details/dialog state,
  media, and scroll containers.
- [ ] Stable child custom elements do not disconnect during parent patches.
- [ ] Changed observed attributes invoke native `attributeChangedCallback()` exactly once.
- [ ] Property parts do not invoke `attributeChangedCallback()` unless reflection does.
- [ ] Intentionally replaced child boundaries produce one disconnect/connect lifecycle pair.
- [ ] Keyed moves preserve child identity and do not reconnect the moved element.

### Reactivity and scheduling

- [ ] Attribute > pre-upgrade JavaScript property > decorator default precedence.
- [ ] Property-to-attribute reflection without setter re-entry.
- [ ] External attribute-to-property conversion.
- [ ] Removed attributes and boolean attributes.
- [ ] `attribute: false` object properties.
- [ ] Synchronous watcher order and explicit synchronous flush.
- [ ] Pre/post effects once per coalesced batch.
- [ ] Change back to original value before flush.
- [ ] Mutation during render/update hooks and loop detection.
- [ ] Disconnect/reconnect before queued microtask delivery.
- [ ] Multiple dirty components under one scheduler flush.
- [ ] Signal writes coalesce into one component commit.
- [ ] Unrelated signal-backed parts are skipped.
- [ ] Signal subscriptions are disposed on disconnect and restored on reconnect.

### Hydration

- [ ] Marked and unmarked light DOM.
- [ ] Declarative open shadow root.
- [ ] Missing, wrong-version, duplicate, and out-of-order markers.
- [ ] Static node, tag, attribute, namespace, and part-count mismatch.
- [ ] Nested hydratable parent and child components.
- [ ] Parent matches while child recovers locally.
- [ ] `auto`, `required`, `recover`, and `throw` combinations.
- [ ] First post-hydration patch preserves server-created node identity.
- [ ] Hydration errors avoid leaking sensitive text/attribute content.
- [ ] Server/client deploy skew and stale cached HTML.

### Existing framework behavior

- [ ] `@BeforeInit`, `@AfterInit`, and lifecycle event ordering.
- [ ] `@BindEvent`, host, window, document, application, and class-scoped events.
- [ ] `@Element`, `@Property`, `@State`, `@Watcher`, `@Param`, emitters, and exposed methods.
- [ ] Router-owned outlet content.
- [ ] Dota Wrap bootstrap and generated component registration.
- [ ] Dota UI and application component compatibility.
- [ ] All existing Dota Core tests remain green in legacy mode.

## Definition of ready for “core hydration and patch support”

The core API is not ready merely because a renderer can update one text node. It is ready for an
application pilot when all of these are true:

### Architecture

- [ ] `BaseElement` no longer implements renderer, scheduler, hydration, metadata compilation, or
  view-binding algorithms.
- [ ] Each mutable subsystem has one owner and a tested disposal path.
- [ ] Legacy and template engines implement one common renderer contract.
- [ ] Hydration consumes the same template definition as client mount and server/build output.
- [ ] Runtime services can be injected in tests without patching private element fields.

### API

- [ ] Existing string components require no immediate rewrite.
- [ ] New `html` templates keep static strings and dynamic values separate.
- [ ] Property/state change detection is configurable.
- [ ] `requestUpdate`, synchronous flush, and `updateComplete` have stable meanings.
- [ ] Commit results distinguish mount, hydrate, patch, replace, and no-op.
- [ ] Hydration and mismatch policies are explicit in component/runtime config.

### Patching

- [ ] Text, attribute, boolean attribute, property, nested template, and iterable parts work.
- [ ] Keyed lists preserve the identity of stateful nodes.
- [ ] Parent patches respect child component ownership boundaries.
- [ ] Normal dynamic values are text-safe; raw HTML is explicit.
- [ ] No-op updates write nothing to the DOM.

### Hydration

- [ ] Light DOM and declarative shadow DOM attach without root replacement.
- [ ] Matching markup becomes interactive and supports later patches.
- [ ] Marker versions and template identities are deterministic.
- [ ] Mismatch recovery is local, observable, and tested.
- [ ] A browser-free or build-time serializer can produce valid fixtures from the same templates.

### Quality and performance

- [ ] Real-browser correctness matrix is green.
- [ ] Dota Core, UI, router, wrapper, and application tests/builds are green.
- [ ] Operation counts demonstrate smaller commits in every claimed patch scenario.
- [ ] Production browser benchmarks show no material legacy regression.
- [ ] Bundle, memory, disposal, and long-task gates pass.
- [ ] Documentation includes migration, lifecycle, value semantics, security, and debugging.

## Non-goals for the first implementation

- A React-style full virtual DOM.
- Implicit deep proxy reactivity.
- Heuristic hydration of arbitrary unmarked HTML.
- A generic DOM diff engine as the only update mechanism.
- Event expressions in templates while decorator delegation is sufficient.
- Request-time SSR for components that directly require browser-only instance state.
- Default viewport deferral for all components.
- Depending on experimental browser DOM Parts APIs for correctness.
- Exposing every internal controller as a permanent public API in the first release.

## Risks and controls

| Risk | Control |
| --- | --- |
| Too many abstractions increase call and maintenance cost | Require each extracted API to own state, policy, or a replaceable algorithm; benchmark the hot path |
| Template API breaks string consumers | Add lowercase `html`; keep uppercase `HTML` and `StringRenderEngine` during migration |
| Hydration silently shows wrong content | Version markers; diagnostic `required/throw`; local explicit recovery |
| Server and client templates drift | Share compiler/serializer definitions and add cross-build fixtures |
| Patch logic corrupts stateful DOM | Browser tests for focus, selection, forms, keyed identity, SVG, slots, and custom elements |
| A shared scheduler changes ordering | Preserve insertion order first; generation checks; document component-local completion |
| Custom comparers hide updates | Keep comparers explicit, cheap, typed, and tested; provide manual `requestUpdate` |
| Raw markup remains an injection path | Text by default; explicit trusted `unsafeHTML`; support Trusted Types policy |
| Hydration code bloats all consumers | Separate package entry points and verify real tree-shaking |
| Mismatch recovery causes nested double work | Component boundaries, one recovery per generation, child ownership tests |

## Design principles and patterns used

| Principle or pattern | How it applies |
| --- | --- |
| Single Responsibility | `BaseElement` adapts browser callbacks; other APIs own rendering, change tracking, roots, and binding |
| Dependency Inversion | The runtime depends on renderer/scheduler/hydrator contracts, not concrete code inside the element |
| Strategy | String rendering, template rendering, hydration policy, scheduling, and initial mount are replaceable choices |
| Unit of Work | `ChangeSet` and the scheduler coalesce several mutations into one commit |
| Reactive dependency graph | Optional signals identify the source of invalidation and let parts skip unrelated work |
| Flyweight | One immutable compiled component/template definition is shared across instances |
| State | Explicit component phases replace overloaded booleans |
| Adapter | Legacy string output participates through `StringRenderEngine` |
| Command-like patching | A part knows the minimal DOM mutation for its value kind, without a full virtual DOM |
| Open/Closed | New part or renderer capabilities can be added without editing native lifecycle callbacks |
| Interface Segregation | Component authors see `html`, properties, and update methods; server and advanced renderer APIs use subpaths |
| Progressive Enhancement | Existing HTML remains visible; hydration adds behavior; unsupported optional policies fall back safely |
| Pay for Play | Legacy, hydration, server serialization, diagnostics, and optional generic diff code can be split |

## Recommended immediate next step

Do not start with hydration code inside the current `connectedCallback()`. Start with Phases 0–2:

1. lock lifecycle, identity, and browser benchmarks;
2. compile immutable component definitions;
3. extract a `ComponentRuntime`, `RenderRootController`, bindings, and a behavior-identical
   `StringRenderEngine`;
4. make shadow-root adoption and reconnect idempotent;
5. only then add `ChangeSet` and the opt-in structured template engine.

This sequence creates the seam that hydration, patching, and render deferral all need. It also
keeps each refactor reviewable: if Phase 2 changes output, the problem is the extraction, not a
new diff algorithm mixed into the same patch.

## Related sources

Repository sources:

- [`BaseElement`](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts)
- [`HeroSectionComponent`](../../../../../packages/apps/dota-web/src/components/home/hero-section.component.ts)
- [`PropertyUtils`](../../../../../packages/libs/dota-core/src/core/utils/PropertyUtils.ts)
- [`HTML` string tag](../../../../../packages/libs/dota-core/src/core/render/html.render.ts)
- [`@Component`](../../../../../packages/libs/dota-core/src/core/decorators/component.decorator.ts)
- [`@Property`](../../../../../packages/libs/dota-core/src/core/decorators/property.decorator.ts)
- [`bootstrap`](../../../../../packages/libs/dota-core/src/core/helper/bootstrap.ts)

Platform and renderer references:

- [HTML DOM API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API)
- [`<template>` and `DocumentFragment` parsing](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template)
- [`Range` DOM operations](https://developer.mozilla.org/en-US/docs/Web/API/Range)
- [`DOMParser.parseFromString()`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString)
- [`Node.isEqualNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/isEqualNode)
- [`MutationObserver.observe()`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe)
- [`CustomElementRegistry`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry)
- [Custom-element lifecycle callbacks](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [`Element.moveBefore()` availability and fallback](https://developer.mozilla.org/en-US/docs/Web/API/Element/moveBefore)
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Declarative Shadow DOM with `<template shadowrootmode>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template#declarative_shadow_dom)
- [`attachShadow()` behavior for an existing declarative root](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#calling_this_method_on_an_element_that_is_already_a_shadow_host)
- [Lit structured template API](https://lit.dev/docs/api/templates/)
- [Lit reactive properties and change detection](https://lit.dev/docs/components/properties/)
- [Lit update lifecycle](https://lit.dev/docs/components/lifecycle/)
- [Lit keyed lists](https://lit.dev/docs/templates/lists/)
- [Lit SSR client hydration](https://lit.dev/docs/ssr/client-usage/)
- [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
