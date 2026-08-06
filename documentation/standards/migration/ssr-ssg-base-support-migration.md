# SSR/SSG Base Support Migration

This plan prepares Dota components to show useful HTML before browser JavaScript runs, then become interactive without throwing that HTML away. That improves search-engine visibility, page previews, and the first experience for people on slow connections.

It focuses only on the shared component foundation in `dota-core`: `@Property`, property types, `HelperUtils`, `BaseElement`, and the closely related `PropertyUtils`. It deliberately does not choose a router, server framework, data-fetching strategy, or deployment platform. Those pieces can be added later once the component foundation can safely work on both the server and in the browser.

> **Update (2026-08-06):** the pieces this plan deferred now exist and are coordinated by the
> [SSR + hydration implementation plan](../hydration-ssr/ssr-hydration-implementation-plan.md):
> - a **rendering engine** with targeted DOM patching and mount markers (`@ayu-sh-kr/dota-rendering`),
>   already consumed by `BaseElement` via `mountRender` — hydration reuses it rather than adding a
>   parallel renderer;
> - a **router** that injects a page component tag into the root and overwrites it on first load
>   (`dota-router` coordinator) — so hydration has a *second* overwrite point to make adopt-aware,
>   beyond `BaseElement`;
> - a decided delivery model: **build-time prerender (SSG) first, no runtime server added** (the Vite
>   dev server is not SSR).
> The property/value contract below (Phases 0–3) is still the prerequisite that lets server and client
> agree on initial values; Phase 4's `mountOrHydrate()` is now specified against the shipped
> `bindHTML()` and `dota-rendering` markers in the coordinating plan.

## What we are trying to achieve

Today, a page can send this to a browser:

```html
<blog-preview header="SSR support" description="..."></blog-preview>
```

The visible card is created only after the browser downloads JavaScript, defines the custom element, and runs its lifecycle. A crawler or a visitor with JavaScript delayed may see only the empty `blog-preview` element.

After this migration, the server or static-site build can send the meaningful content immediately:

```html
<blog-preview header="SSR support" description="..." data-dota-hydrate="1">
  <article>
    <h2>SSR support</h2>
    <p>...</p>
  </article>
</blog-preview>
```

When JavaScript arrives, the component should keep the `<article>` that is already there, attach its event handlers, and continue working normally. This hand-off is called **hydration**: browser code takes ownership of HTML that was already rendered elsewhere.

The success criteria are therefore simple:

1. The server can calculate a component's initial values and render its meaningful HTML without creating a browser `HTMLElement`.
2. The browser calculates those same initial values when it upgrades the custom element.
3. If the HTML matches, the browser keeps it and only adds behaviour.
4. A later property or state change still updates the component as it does today.

## Why the current base layer cannot do this

### The current order is browser-first

The relevant work currently happens in this order:

```text
@Property records information about a field
        |
        v
BaseElement.connectedCallback()
        |
        +-- bindHTML() runs render() and replaces the element's contents
        |
        +-- bindProperties() reads attributes/defaults and makes properties reactive
```

This creates two problems that are connected:

- The component renders before its attributes and defaults have been fully turned into typed properties. A server needs the values first, because it has only one chance to generate the initial HTML.
- `bindHTML()` always replaces the existing HTML. That is correct for a browser-only component with no content yet, but it removes the useful HTML that SSR/SSG just produced.

For example, a component with `@Property({name: 'limit', default: '10', type: Number})` needs to decide whether `limit` is `10`, a value written in HTML, or a value supplied by JavaScript *before* it renders. The current code makes that decision after its first `render()` call.

### A server cannot safely load the current component class

[`BaseElement`](../../../packages/libs/dota-core/src/core/elements/base-elements.ts) directly extends the browser's `HTMLElement`. Its constructor also creates event-related services. Neither exists in a normal Node-based SSG/SSR process.

That means this is not a safe server-side design:

```ts
// Not a migration strategy
new BlogPreview().render();
```

Trying to fake a browser DOM on the server would make rendering depend on a partial and fragile browser imitation. It would also allow accidental reads of `window`, `document`, layout measurements, or event services to leak into server rendering.

Instead, the server needs a small, browser-independent description of the component and a browser-independent function that creates its initial HTML. The existing custom-element class stays valuable, but becomes the browser adapter that handles DOM updates and events after the HTML exists.

### The property system mixes several different jobs

[`@Property`](../../../packages/libs/dota-core/src/core/decorators/property.decorator.ts) currently does two jobs at class-definition time:

1. It saves information such as the attribute name, class-field name, default, and type.
2. It adds the attribute name to `observedAttributes`, which is a browser custom-element setting.

Those jobs need different homes. The first is useful on both server and browser. The second is useful only when the browser registers a custom element.

[`HelperUtils`](../../../packages/libs/dota-core/src/core/utils/HelperUtils.ts) stores this information in `reflect-metadata`, under a key made from the class name. This makes the information difficult to use outside the legacy decorator runtime, and class names are not stable identifiers: they can be shortened in a production build and can be shared by unrelated classes. Inheritance needs care as well: looking up inherited metadata and then changing it can accidentally modify the base component's information.

[`PropertyType`](../../../packages/libs/dota-core/src/core/types/property.types.ts) has one general `process()` method and an optional `serialize()` method. SSR/SSG needs clearer answers:

- How should an HTML attribute be read? For example, is an empty boolean attribute `true`?
- How should a JavaScript value be checked or converted?
- How should the value be written back to an HTML attribute?
- What does an absent attribute mean, and how is it different from an empty one?

The existing `FunctionType` is particularly unsuitable for server output because it evaluates a string with `Function()`. A function must never be sent as an HTML attribute or treated as part of a server-rendered property contract.

### Shadow DOM needs a different first step

For a normal component, server HTML belongs inside the custom element. For a shadow component, supported browsers can receive a **Declarative Shadow DOM** template from the server. The browser turns that template into `shadowRoot` before the custom element upgrades.

The current `bindHTML()` always calls `attachShadow()` for a shadow component. That would fail when a declarative shadow root already exists. The new browser lifecycle must reuse an existing shadow root and only create one when the server did not provide it.

## The design we are moving toward

The main change is to create one shared component description. Think of it as a component's recipe: its tag name, whether it uses shadow DOM, and the list of properties it accepts. The recipe contains no browser objects, so both environments can read it.

```text
decorators collect the component recipe
                 |
                 v
       shared component definition
       - property names and defaults
       - rules for reading/writing values
       - tag name and shadow setting
                 |
       +---------+----------+
       |                    |
       v                    v
server/static build     browser custom element
resolve values          observe attributes
render initial HTML     adopt HTML, add events, react to changes
```

This separation has one important benefit: both sides use the same rules to decide a property's first value. If the server sees `limit="25"`, the server view gets the number `25`, and the browser gets the number `25` during hydration. Matching values are what allow the browser to keep the server's HTML.

### A clear property contract

The implementation should replace the ambiguous single conversion path with a small property codec. The names may remain compatible with `PropertyType` and `PropertyConfig` during the transition, but the responsibilities must become explicit.

```ts
interface PropertyCodec<T> {
  // Reads an HTML attribute. null means the attribute is absent.
  fromAttribute(value: string | null): T | undefined;

  // Optional: checks or converts a JavaScript-supplied value.
  fromProperty?(value: unknown): T;

  // Produces an attribute value. null means omit/remove the attribute.
  toAttribute(value: T): string | null;
}
```

The server renderer is responsible for escaping `toAttribute()` output before putting it into an HTML string. The browser does not need that step because `setAttribute()` handles the HTML boundary itself. Keeping these responsibilities separate avoids unsafe JSON or quote handling in server HTML.

The migration must make the following rules public and testable:

| Situation | Rule to define | Why it matters |
| --- | --- | --- |
| Attribute is absent | Use a supplied JavaScript value, then the decorator default, then `undefined`. | The server and browser must agree on what a component renders when an attribute is omitted. |
| Attribute is empty | Treat it according to the property's codec, not as automatically absent. | Empty string is a meaningful HTML value, especially for boolean attributes. |
| Attribute is removed later | Recalculate the property using the same fallback order. | Current code keeps the old value; that is surprising and prevents a predictable update. |
| Default value | Convert it using the property's normal rules. | A number default and the equivalent HTML attribute should not produce different types. |
| Boolean | Choose and document either HTML presence/absence or the existing `"true"`/`"false"` representation. | This is a public compatibility decision for component authors. |
| Object | Serialize safely, escape the resulting HTML, and reject cyclic/unserializable values. | Server output must be valid and safe, not silently corrupted. |
| Function | Keep it browser-only as a JavaScript property. | Functions cannot be represented safely or meaningfully in static HTML. |

### A shared view, not a fake component instance

Existing components often use `this.property` inside `render()`. That is convenient in the browser, but a server cannot rely on the full custom-element instance.

For each SSR-capable component, move the deterministic markup into a shared view function. The browser `render()` calls it with the component's current properties; the server calls it with the resolved initial properties. The view receives data and returns HTML, but does not access `window`, `document`, measurements, or event services.

```text
shared view(props) -> HTML
       ^                 ^
       |                 |
browser render()     server/static renderer
```

This is intentionally incremental. A component can remain browser-only until its view is safe to share. The first candidates should be static, light-DOM components that already render text, links, images, or cards. Components that need canvas, animation, measurements, storage, or live browser-only data can be marked `client-only` or provide a simpler server shell.

## Migration plan

### Phase 0 — Agree on today’s behaviour before changing it

First, write tests that describe the current and desired property behaviour. Cover field initializers, defaults, attributes set before the element connects, empty attributes, removed attributes, objects, duplicate property names, inheritance, and reconnecting an element.

Also add a simple server-import test. It should import the new server entry point in a process that has no `window`, `document`, `HTMLElement`, `customElements`, or `reflect-metadata` global. This test proves that the server-facing foundation is truly independent of the browser.

Why this phase comes first: property behaviour is already part of the public component API. Without tests, a later refactor could change a value from a number to a string, or change attribute-removal behaviour, without anyone noticing until it affects a page.

**Complete when:** the team has written down and tested every property rule that the next phases rely on.

### Phase 1 — Build the shared property recipe

Create a browser-independent component-definition registry and a pure function that resolves a component's starting properties. “Pure” means it receives plain input values and returns plain output values; it does not read the DOM, create an element, or change global state.

The registry must use the component constructor itself as its identity, for example through a `WeakMap`, rather than using the class name as text. When a component extends another component, copy the base definition before adding child properties. This prevents a child component from changing what the base component observes.

Implement the built-in string, number, boolean, and object codecs. Each codec must describe absent, empty, valid, invalid, and reflected values. Reject values that cannot safely become HTML, including functions, symbols, `BigInt`, and circular objects.

Why this phase matters: it gives the server and browser one source of truth for values, which is the prerequisite for matching HTML during hydration.

**Complete when:** Node-only tests resolve the same typed values that browser tests will later use, with no `HTMLElement` import.

### Phase 2 — Move `@Property` onto the shared recipe

Update `@Property` so it records a portable property definition. It should stop directly changing `observedAttributes`.

When the browser registers a component, it reads the completed recipe and creates a new `observedAttributes` array for that particular class. This preserves the browser custom-element contract while avoiding accidental sharing between a base class and a derived class.

Update `HelperUtils` to read the new registry. During the transition it may keep an adapter for code still compiled with legacy decorators, but new code should not need a class-name-based Reflect Map. The TypeScript/Vite decorator migration has the broader compatibility strategy; this work uses that strategy only where the property path needs it.

Why this phase matters: decorators become a way to describe a component, rather than a place where browser-only setup is performed. That lets the server see the same description safely.

**Complete when:** legacy and standard decorator test fixtures produce the same property recipe, and base/derived/sibling components cannot change one another's metadata.

### Phase 3 — Make first render use the same values everywhere

Refactor `PropertyUtils` so it asks the shared resolver for the initial values instead of rebuilding the precedence rules itself. Capture JavaScript values that exist before the custom element upgrades, then install reactive getters and setters.

During the initial setup and hydration hand-off, setting up properties must be quiet. It must not trigger watchers, emit attribute-change events, reflect attributes again, or cause an extra render. Those are real changes only after the component is ready.

When an attribute is removed later, resolve the new value using the documented fallback order and update the component once if the result changed. When a property is set from JavaScript, use the codec to decide whether to write an attribute or remove one.

Why this phase matters: a server-rendered component and a newly created client component now start from the same values. It also removes a common source of hydration mismatch: an initial render based on old or untyped values.

**Complete when:** one input table produces identical initial values in a Node test and in a connected browser element.

### Phase 4 — Let `BaseElement` keep server HTML

Replace the unconditional first `bindHTML()` step with a `mountOrHydrate()` step.

The new order is:

```text
1. Resolve initial properties.
2. Check whether this element carries the Dota server-render marker.
3. If it does and its HTML matches the expected view, keep that HTML.
4. Otherwise, render in the browser and replace the contents.
5. Add events, browser services, and reactive behaviour.
```

For light DOM, keeping HTML means retaining the existing child nodes. For shadow DOM, reuse the shadow root created from Declarative Shadow DOM when it exists; call `attachShadow()` only for a component that has no existing root.

If the browser detects a mismatch, it must make that visible in development and use one documented fallback—normally replacing the component’s contents with a fresh client render. A clear warning is important because silent replacement hides missing SEO content and makes server/client differences hard to find.

Why this phase matters: this is the point at which server HTML stops being a static preview and becomes an interactive Dota component.

**Complete when:** an integration test confirms that an SSR fixture keeps its child-node identity through upgrade, then responds correctly to a later property change and click handler.

### Phase 5 — Add the server renderer and migrate one useful component

Publish a dedicated server entry point. It provides the component recipe, property resolver, safe HTML escaping, and a `renderComponent()` function. It does not create `BaseElement` instances or emulate a browser.

Choose one small, deterministic, non-shadow component from `dota-web`—a preview card is a good first candidate. Extract its shared view, generate a static HTML fixture, then load that fixture in a browser test. Check both sides:

- Before JavaScript, the HTML contains meaningful headings, text, links, and attributes.
- After JavaScript, the same DOM is adopted rather than replaced, and interactions work.

Then classify components as:

- `ssr`: the full meaningful view can be rendered on the server;
- `server-shell`: the server sends useful structure or content, while browser-only detail follows later; or
- `client-only`: the component needs browser APIs immediately and must provide an explicit fallback instead of silently appearing empty.

Why this phase matters: it validates the complete path with a real component before the pattern spreads across the application.

**Complete when:** at least one production-style route contains useful component content in static HTML and hydrates without a replacement render.

### Phase 6 — Expand carefully and remove temporary bridges

Add more components in order of SEO value. Start with content cards, documentation components, and other light-DOM views. Add shadow components only after the supported browser/deployment policy for Declarative Shadow DOM and its fallback has been tested.

Every component marked `ssr` must have both a server-render test and a hydration test. When all supported users have moved from legacy decorators and metadata, remove the old Reflect mirror, name-based metadata keys, and attribute-based `FunctionType` support.

Why this phase matters: migration remains incremental. Components with heavy browser requirements do not block searchable, content-rich parts of the site.

**Complete when:** matching server HTML is never overwritten during normal upgrade, and the property/SSR path no longer requires browser globals or class-name-based metadata.

## How to test the finished behaviour

| What to prove | Example check | Reason |
| --- | --- | --- |
| Property recipe is isolated | A child class adds a property without changing its base class; two same-named classes stay separate. | Component metadata must be trustworthy before server rendering depends on it. |
| Values match | The same attributes, JavaScript values, and defaults produce the same typed result in Node and browser tests. | Matching values lead to matching HTML. |
| HTML is safe | Quotes, text, and object values are escaped; unsupported reflected values fail with a clear error. | Server-rendered strings need protection that DOM APIs normally provide. |
| Hydration keeps DOM | Save a reference to a server-rendered child node, upgrade the element, and verify it is the same node. | This proves the browser adopted server HTML instead of replacing it. |
| Behaviour resumes | Click a hydrated control and change a property after hydration. | SSR is useful only when the component remains fully interactive. |
| SEO content exists | Inspect generated route HTML without running JavaScript. | This is the actual benefit the migration is intended to deliver. |

## Decisions needed before hydration work

The early metadata and property work can begin immediately. Before Phase 4, the team needs answers to these product and compatibility questions:

- Which browsers and deployment targets must support Declarative Shadow DOM? What fallback should users receive when it is unavailable?
- Should new boolean properties use normal HTML presence/absence, or must the current string form remain the permanent default?
- Which object properties are allowed in HTML, how large may their serialized payload be, and where should larger data live instead?
- Is initial server data fixed at build time, or can it change for each request? This affects caching and how the browser receives that data, but not the shared property-recipe design.

## Related work

- [TypeScript 6 and Vite 8 decorator migration plan](typescript-6-vite-8-decorator-migration-plan.md) — provides the wider transition from legacy to standard decorators. The shared recipe should use its compatibility approach, but SSR/SSG support does not need to wait for TypeScript 7.
