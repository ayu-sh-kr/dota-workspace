# @ayu-sh-kr/dota-rendering

Rendering primitives for Dota Core.

The package keeps legacy string rendering available while providing structured template
results whose dynamic values can be diffed and patched without replacing unchanged elements.

```ts
import { html, keyed, render, update, when } from '@ayu-sh-kr/dota-rendering';

const view = render(root, html`<p title=${title}>${message}</p>`);
update(view, html`<p title=${nextTitle}>${nextMessage}</p>`);
```

Core owns component lifecycle and scheduling; this package owns render output, part markers,
diffing, and DOM commits.

## Maintainer guide

The implementation is split into three responsibilities:

1. Template creation packages static strings and dynamic values.
2. Diffing compares outputs without touching the DOM.
3. Rendering parses, indexes, and mutates a DOM root.

This lets Dota Core own lifecycle and scheduling while this package owns the render-to-DOM
boundary.

## Architecture model

The renderer is organized as five cooperating layers. Keeping these layers separate is the
main architectural boundary maintainers should preserve.

| Layer | Owned state | Responsibility |
| --- | --- | --- |
| Template helpers | Static strings, dynamic values, flattening plans | Describe render output without touching the DOM. |
| Diffing | Previous and next output | Select `mount`, `noop`, `patch`, or `replace` without causing side effects. |
| Render session | Current strategy and render root | Preserve the public instance while routing legacy and structured output. |
| Render strategy | Last output, parts, listeners, nested sessions | Translate a diff decision into browser mutations. |
| Render root | Native root or sibling-range boundary | Limit where a strategy may replace or insert nodes. |

`RenderInstance` is intentionally the only stateful renderer contract exposed to Core. The
concrete session, strategies, roots, and part records remain internal so their implementation
can evolve without changing the Core integration.

## Runtime flow

### Initial structured mount

TemplateStrategy.mount() in src/renderer.ts:

1. Creates an inert HTMLTemplateElement.
2. Joins static template strings with temporary dota-value-N tokens.
3. Adds component boundary comments reserved for future SSR and hydration.
4. Traverses the detached template fragment with browser DOM APIs.
5. Assigns document-order indexes and custom-element markers.
6. Converts temporary tokens into in-memory RenderPart records grouped by value index.
7. Applies initial values through direct index lookup while detached, so custom elements cannot
   connect with parser tokens.
8. Attaches the completed fragment to the supplied Element or ShadowRoot.

Temporary dota-value-N tokens are removed during part discovery and never become committed DOM.
Legacy strings use StringStrategy and assign innerHTML directly. RenderSession keeps the public
instance stable when a client changes between legacy and structured output.

### Subsequent update

~~~text
new output
  -> diff(previous, next)
    -> noop       when nothing changed
    -> patch      when compatible values changed
    -> replace    when structure or output kind changed
  -> renderer commits the selected operation
~~~

For a compatible structured template, diff() returns one PartChange per changed value.
TemplateStrategy.update() uses each index to locate an in-memory RenderPart and writes only its
text node or attribute. It does not query the DOM again or replace unchanged elements.

When static structure changes, the renderer remounts, reparses, reindexes, and replaces the
previous root content. This is the safe fallback because generic whole-tree reconciliation is
not implemented.

## Render sessions and root ownership

### RenderSession

`RenderSession` is the stable identity returned by `render()`. It owns one `RenderRoot` and one
active strategy:

- `StringStrategy` handles legacy `string` and `nothing` output;
- `TemplateStrategy` handles `TemplateResult` output and retained parts.

An update with the same output kind stays within the current strategy. Moving from a string to
a template, or from a template back to a string, disposes the old strategy and creates the new
one while preserving the same public `RenderInstance`. Core therefore does not need separate
storage or migration logic for old and new component render methods.

Sessions form an ownership tree. The top-level session belongs to the component root. A
conditional branch owns a nested session, and every keyed entry owns another nested session.
Disposal cascades through that tree so event listeners and child ranges do not survive after
their owner is replaced. Calling `dispose()` releases renderer-managed resources but does not
remove the already committed DOM.

### NativeRoot

`NativeRoot` adapts an `Element` or `ShadowRoot`. Structured replacement delegates to
`replaceChildren()`, while legacy output deliberately uses `innerHTML` to preserve the behavior
expected by existing clients. A component should keep one session for its owned native root and
send every later output through `patch()` or `update()`.

### RangeRoot

`RangeRoot` adapts the siblings between two invisible text boundaries. It lets a conditional or
keyed item mount, patch, replace, and clear only its own section without replacing the parent
element or adjacent children. Legacy strings rendered inside a range are parsed through an
inert `HTMLTemplateElement` and then inserted between the boundaries.

Each session owns its own part map and indexing namespace, including sessions nested inside the
same physical DOM tree. Repeated `data-dota-index="0"` values are therefore expected across a
parent template, a conditional branch, keyed entries, or a child component. Index attributes
are diagnostics for a mounted template; they are never queried globally and are not node
identity.

## DOM marker meanings

Structured mounts add small markers for Core, diagnostics, and future SSR or hydration:

~~~html
<!--dota-component-start-->
<dota-card data-dota-index="0" data-dota-dynamic="" data-dota-component="dota-card">
  Count: 1
</dota-card>
<!--dota-component-end-->
~~~

### data-dota-index

Every rendered element receives a document-order index beginning at 0. The index is valid only
for the current static structure. A structural replacement receives fresh indexes; an index is
not permanent identity across replacements.

Indexes are local to one renderer root. A parent component and child component can both contain
indexes 0, 1, and 2 because their RenderSession instances own separate in-memory maps. The
renderer patches using stored node references and never queries globally by data-dota-index, so
equal numbers in nested components cannot collide.

### data-dota-dynamic

An element receives one empty marker when one or more interpolations belong to it. It is one
marker per element, not one marker per interpolation. The exact interpolation index, target
attribute, and text-node reference remain in runtime-only RenderPart records.

### data-dota-component

An element whose local name contains a hyphen is treated as a custom-element candidate and gets
data-dota-component containing its local name. This follows the platform naming convention and
works before customElements.define() has run. A parent renderer marks the custom-element host;
the child component's own renderer handles its internal DOM.

Declarative light-DOM children belong to the parent template that created them. A custom element
that renders into its own light DOM will replace those children and therefore must not share that
same region with parent-owned dynamic content. Components that accept parent-owned children
should render internally to ShadowRoot and expose a slot; light-DOM components should receive
dynamic input through their host attributes or properties.

### Component boundary comments

dota-component-start and dota-component-end comments surround the fragment. They are not dynamic
part markers and are not used by the current patcher. They are reserved for future SSR output
and hydration boundaries.

## Detailed source map

### src/main.ts

The public barrel. It re-exports the contracts, template helpers, diff(), and renderer entry
points. It contains no rendering logic.

### src/types.ts

This module defines the contracts exchanged by template creation, comparison, and DOM commits:

- nothing is the explicit empty-output sentinel;
- RenderOutput is the accepted output union;
- TemplateResult carries static strings and dynamic values;
- UnsafeHtmlValue brands application-owned markup accepted by unsafeHTML();
- KeyedValue and KeyedTemplate describe child ranges reconciled by stable RenderKey identity;
- ConditionalValue describes the branch selected by when();
- PartChange reports one changed interpolation;
- RenderDiff selects mount, noop, patch, or replace;
- CommitKind reuses the RenderDiff strategy union;
- CommitResult describes observable DOM work;
- RenderInstance is the stateful handle returned by render().

These contracts intentionally do not expose `RenderSession`, `TemplateStrategy`,
`StringStrategy`, `NativeRoot`, or `RangeRoot`. Core should depend on renderer behavior, not its
implementation classes.

### src/template.ts

This module creates structured results and defines parsing policies:

- html(strings, ...values) packages a TemplateResult without DOM side effects and flattens
  nested TemplateResult values or arrays into one patchable structure. Stable nested shapes
  reuse a cached flattening plan and static strings while collecting only the next leaf values;
- unsafeHTML(value) explicitly merges trusted application-owned HTML or SVG into static
  structure while ordinary strings remain text values;
- keyed(items, getKey, renderItem) retains, inserts, removes, and moves item ranges by stable key;
- when(condition, truthy, falsy) replaces only its local child range when a branch changes;
- valueMarkerFor(index) creates the parser-only dota-value-N token;
- valueMarkerPattern finds temporary tokens in parsed text and attributes;
- valueText(value) applies child text conversion and empty-value semantics;
- isAttributePosition(source) checks a source-level attribute position for consumers that need
  it; the current renderer discovers attributes after browser parsing;
- isTemplateResult(value) checks the structured-result kind brand.

If the temporary token format changes, update valueMarkerFor() and all consumers of
valueMarkerPattern together.

### src/diff.ts

This module contains pure comparison policy. It does not create nodes, mutate attributes, or
access a render root.

hasSameTemplateStructure() decides whether static strings keep existing part indexes valid.
TemplateStringsArray identity is the fast path; segment comparison supports separately created
but equivalent results.

diff() compares in this order:

1. undefined previous output produces mount;
2. object identity produces noop;
3. non-template combinations produce replace;
4. different static structures produce replace;
5. equal dynamic values are skipped;
6. changed dynamic values produce PartChange records.

This prevents part-level patching when static DOM structure is not compatible.

### src/renderer.ts

This module owns browser interaction:

- ChildPart and AttributePart are runtime-only part records;
- RenderPart is their union;
- NativeRoot and RangeRoot provide whole-root and local-range mutation boundaries;
- StringStrategy implements opaque string replacement;
- TemplateStrategy implements parsed templates and in-place value patches;
- RenderSession preserves public instance identity while changing strategy;
- patch() is the explicit commit entry point;
- update() is the scheduler-oriented alias;
- render() selects and mounts the strategy.

The internal classes are not exported. Core should use render(), patch(), update(), and the
public contracts from types.ts.

#### RenderPart

RenderPart maps dynamic indexes to DOM write operations. ChildPart stores invisible text-node
range boundaries used for text, conditional branches, and keyed lists. AttributePart stores all
indexes used by an attribute, its target, binding mode, and tokenized value. The mapping stays in
memory rather than becoming verbose DOM metadata.

#### StringStrategy

The legacy strategy. It writes innerHTML on mount and changed updates, while exact-equal output
returns noop. It cannot discover interpolation boundaries because a complete string has already
flattened them.

#### TemplateStrategy

The structured strategy owns the root, last output, and RenderPart map keyed by dynamic value
index. update() selects noop, part patch, or remount. findParts() traverses parsed DOM,
applyIndexes() deduplicates affected parts, and mount() parses and indexes a fresh structure.

#### patch(instance, output)

The explicit commit API for code that already owns a RenderInstance. It delegates to the
instance update policy and returns CommitResult.

#### update(instance, output)

The scheduler-facing alias for the same commit operation. The name lets Core describe an update
without depending on whether the strategy patches or replaces.

#### render(root, output)

The mount entry point. It creates a RenderSession, selects the appropriate strategy, commits the
first output, and returns the stateful instance for later updates.

## Part discovery details

findParts() collects text nodes before replacing them because mutating a TreeWalker traversal
while walking can change what the traversal sees.

For each text node containing temporary tokens, it creates invisible empty Text boundaries for
each dynamic child. ChildPart uses the bounded range for ordinary text, a conditional branch, or
a keyed list. Empty text boundaries do not appear in serialized innerHTML.

For attributes, findParts() scans actual parsed attributes. Each tokenized attribute becomes one
AttributePart registered under every interpolation index it contains. Any changed interpolation
reconstructs the complete attribute using all next values.

Structured attribute syntax is explicit:

- `class="card ${size} theme-${theme}"` reconstructs a multi-value ordinary attribute;
- `?disabled=${disabled}` toggles a boolean attribute by presence;
- `.value=${value}` writes the DOM property, preserving form control state semantics;
- `@click=${listener}` replaces or removes an EventListener without remounting the element.

Property, boolean, and event bindings must contain exactly one interpolation. Event listeners
are removed on replacement and disposal.

## Template flattening architecture

Flattening happens in `html()` before diffing or DOM parsing. Its purpose is to turn nested
templates into one canonical sequence of static strings and dynamic leaf values. Without this
step, a nested `TemplateResult` would be an opaque value at one parent interpolation and the
renderer could not patch the nested template's individual attributes or children.

For example, this composition:

~~~ts
const item = (label: string) => html`<li>${label}</li>`;
const view = (labels: string[]) => html`<ul>${labels.map(item)}</ul>`;
~~~

is normalized conceptually into the same shape as one template containing every `<li>` and
every label interpolation. The flattened values share one index space with the parent. This is
an output normalization step only; it does not create DOM, markers, sessions, or keyed identity.

### Flattening fast path

When an `html` call contains only ordinary dynamic values, it returns the original
`TemplateStringsArray` and values without allocating a flattening plan. Ordinary values include
strings, numbers, booleans, objects, keyed directives, conditional directives, and arrays that
contain no nested template or `unsafeHTML()` value.

An ordinary array is therefore not a retained list. In a normal child position it follows
JavaScript string conversion. Use `keyed()` when each array item needs independent DOM identity.

### Structural values

The following values are recursively flattened:

- a nested `TemplateResult`;
- an array containing a nested template or another structurally flattened array;
- an `unsafeHTML()` directive.

Nested template static segments are merged into the parent segments, while their ordinary leaf
values are appended to the flattened dynamic value list. Trusted markup is also merged into
static structure. Consequently, changing the exact `unsafeHTML()` markup changes template
structure and requires replacement rather than a value patch.

### Flatten-plan cache

JavaScript reuses the `TemplateStringsArray` for repeated evaluations of the same tagged-template
call site. `html()` uses that identity as a key in a `WeakMap` and stores the most recent
`TemplateFlattenPlan` for the call site. The weak key prevents the cache from extending the
lifetime of a call site.

A plan records flattened static strings plus a recursive shape description:

- `value` means one ordinary dynamic leaf;
- `template` records the nested template-string identity and its child shapes;
- `array` records item order, length, and child shapes;
- `unsafe-html` records the exact trusted markup included in static structure.

On the next call, the processor replays current values against this shape. Compatible structure
reuses the same flattened strings and collects only the new dynamic leaves. A different nested
template call site, array length, nested shape, or trusted markup invalidates the plan; `html()`
then rebuilds and replaces that call site's cached plan.

The cache retains only the latest shape for a call site. Alternating between two structural
branches can therefore rebuild the flattening plan each time. For frequently changing branches
use `when()`, and for changing collections use `keyed()`, so structure is owned by local ranges
instead of repeatedly changing the parent template.

### Template compatibility after flattening

`diff()` first uses static-string identity and then falls back to segment equality. If flattened
static strings remain compatible, changed leaf values produce indexed patches and existing
elements are reused. If static segments differ because elements were inserted, removed,
reordered, or nested differently, the result is `replace`; the strategy reparses, reindexes, and
commits a new fragment.

This explicit fallback avoids a general-purpose tree-diff algorithm. Document-order indexes are
valid only for the current mounted structure and are regenerated after replacement.

## Keyed range architecture

`keyed()` is the explicit opt-in for collection identity:

~~~ts
const view = (items: readonly Item[]) => html`
  <ul>
    ${keyed(items, item => item.id, item => html`<li>${item.label}</li>`)}
  </ul>
`;
~~~

The helper creates ordered `KeyedTemplate` entries but does not mutate the DOM. When the value
reaches a `ChildPart`, `TemplateStrategy` reconciles it inside that part's invisible boundaries.
Each key owns:

- an inclusive start/end text range;
- a `RangeRoot` limited to that range;
- a nested `RenderSession` that patches the item's current template.

Reconciliation runs in a deliberate order:

1. Validate every next key before mutation. Duplicate keys throw and leave the existing list
   untouched.
2. Dispose and remove ranges whose keys are absent.
3. Update retained sessions with their next templates.
4. Create boundaries and sessions for new keys.
5. Walk the desired order backwards and move each inclusive range before the current cursor.

Retained keys preserve their element and session identity even when their values update or their
position changes. A retained item's own static-template change replaces only that key's range,
not the parent list.

When the parent supports `moveBefore()`, keyed reordering uses it for a state-preserving
atomic move. The compatibility fallback moves nodes through a `DocumentFragment`; node identity
is retained, but browsers may run disconnect/connect reactions or disturb transient embedded
state. Consumers that depend on atomic lifecycle preservation should account for browser
support.

Keys are scoped to one `keyed()` value and may be strings, numbers, or symbols. They must be
unique among sibling entries and stable across renders. Array position is usually a poor key
when insertion or reordering is possible.

## Conditional range architecture

`when()` uses the same range and nested-session model for one selected branch:

~~~ts
html`<section>${when(isReady, html`<strong>Ready</strong>`)}</section>`
~~~

Changing branches clears or replaces only the child range; the parent element remains mounted.
Repeated renders of the same branch update its nested session normally. Transitioning a child
part between scalar text, conditional output, and keyed output disposes the previous mode before
the next mode takes ownership.

## Trusted structural markup

Use `unsafeHTML()` only for application-authored or sanitized markup. It bypasses normal text
semantics and becomes part of the static template source passed to the browser's `innerHTML`
parser. It does not sanitize, escape, or create a Trusted Types value. Ordinary string
interpolations remain text and are the correct choice for user-controlled data.

## Architecture decisions

The following decisions describe the current implementation. They are constraints for changes,
not proposals.

| Decision | Reason and consequence |
| --- | --- |
| Preserve legacy string rendering | Existing components can continue returning strings. Equal strings are no-ops; changed strings remain whole-boundary replacements because they contain no part metadata. |
| Keep `RenderInstance` stable | Core retains one handle even when a component migrates between legacy strings and structured templates. `RenderSession` changes its internal strategy instead. |
| Separate pure diffing from DOM commits | `diff()` can be tested and consumed without browser mutation. Strategies remain solely responsible for applying the selected operation. |
| Parse with the browser in a detached template | Browser parsing handles real HTML structure more reliably than source-level regular expressions. Part discovery and initial values complete before custom elements connect. |
| Store precise part metadata in memory | Interpolation indexes, node references, attribute templates, listeners, and keyed ownership do not pollute serialized DOM. Only compact element-level diagnostic markers remain. |
| Use one dynamic marker per affected element | `data-dota-dynamic` narrows diagnostics without creating one attribute for every interpolation. Exact relationships remain in `RenderPart` records. |
| Treat document indexes as local diagnostics | `data-dota-index` describes document order for one mounted template. It is regenerated after remount and is never global identity or the lookup mechanism for patches. |
| Mark custom-element hosts, not rendered internals | Hyphenated hosts receive `data-dota-component`. Content later created by their callback or shadow renderer belongs to a different rendering session and is not traversed by the parent mount. |
| Flatten composition before comparison | Nested templates expose one patchable interpolation index space. Shape caching avoids rebuilding stable flattened strings. |
| Require explicit keyed and conditional ranges | Structural collection and branch changes remain local without introducing an implicit whole-tree reconciler. |
| Replace incompatible static structure | A remount is safer and deterministic when existing part indexes no longer describe the next template. |
| Apply initial values while detached | Attributes, properties, events, and child values are ready before custom elements connect to the live document. |
| Dispose renderer-owned resources explicitly | Event listeners and nested sessions are removed before strategy replacement, branch removal, keyed deletion, or public disposal. |
| Keep component boundary comments non-operational | The comments establish a possible SSR/hydration boundary format, but the client patcher does not depend on them yet. |

### Ownership rules for custom elements

A parent structured template owns the custom-element host and any declarative light-DOM children
present in that parent template. It does not inspect content later produced by the custom
element's `connectedCallback`, child render session, or shadow root. The child renderer starts a
new index and part namespace.

This boundary prevents a parent update from accidentally patching child-owned internals. It also
means a custom element that replaces its own light DOM must not share that region with
parent-owned dynamic children. Prefer host attributes or properties for input; use a shadow root
and slots when the parent must retain ownership of projected children.

## Current limitations

- Changed legacy strings are replaced as a whole; only exact equality is optimized.
- Arrays containing templates are flattened and structurally remount when their shape changes;
  ordinary arrays use scalar text conversion, and `keyed()` is required for retained item identity.
- Changed static templates remount instead of using generic tree diffing.
- Hydration and mismatch recovery are represented by boundary markers but not implemented.
- The flatten-plan cache stores only the latest structural shape for each outer call site.
- Atomic keyed moves depend on browser `moveBefore()` support; the fallback preserves node
  identity but may trigger custom-element lifecycle reactions.
- `unsafeHTML()` does not sanitize input or satisfy Trusted Types by itself.
- Structured `@event` bindings are renderer-owned; decorator-based legacy events remain owned by
  Dota Core.

Preserve the distinction between diffing and patching when extending the package: diffing
decides what changed, while a renderer decides which browser operation safely applies it.

## Verification

~~~bash
pnpm --filter @ayu-sh-kr/dota-rendering test
pnpm --filter @ayu-sh-kr/dota-rendering test:coverage
pnpm --filter @ayu-sh-kr/dota-rendering build
~~~

The demonstration test prints mount, diff, patch, update, and element-preservation behavior:

~~~bash
pnpm --filter @ayu-sh-kr/dota-rendering exec vitest run test/renderer-demo.test.ts --reporter=verbose
~~~

## Related documentation and source

- [Template normalization and directives](./src/template.ts)
- [Render sessions, roots, strategies, and parts](./src/renderer.ts)
- [Pure output comparison](./src/diff.ts)
- [Public rendering contracts](./src/types.ts)
- [Dota Core rendering and hydration architecture roadmap](../../../documentation/packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md)
