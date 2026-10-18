# Rendering Dota components to HTML without a DOM — analysis, 15 October 2026

Investigation, not an implementation. It asks whether Dota's web components can be rendered to HTML
without happy-dom, and what in the existing framework a string renderer could build on. The only code
run was a read-only probe against Dota Web (method below). Nothing in the repository changed, and no
string renderer exists or was prototyped.

**Short answer.** Most of the framework already points that way. Templates are plain data, template
identity and the hydration marker names do not need a DOM, almost every component uses light DOM and
passes values as attributes, and 79 of 87 components render without touching the DOM tree or a
browser global. The missing pieces are narrow: a minimal element base for the server, a place where
the marker output is generated without a parser, a way to expand nested components, and a data phase.
The existing happy-dom pipeline is a ready-made correctness oracle for all of it.

Measured speed benefit is not established. See [what it would buy](#what-it-would-and-would-not-buy).

## What the framework already gives us

| Seam | Where | Why it helps a string renderer |
| --- | --- | --- |
| `html()` returns plain data | [`template.ts`](../../../../../packages/libs/dota-rendering/src/template.ts) | A `TemplateResult` is `{kind, strings, values}` and `html()` never touches `document`. Nested templates, `unsafeHTML`, and arrays are flattened into one string/value sequence by pure code. |
| Directives are plain data | `keyed()`, `when()`, `trustedHTML()`, `unsafeHTML()`, `nothing` | Each is a tagged object, so a serializer can switch on `kind` without parsing anything. |
| Template identity has no DOM | [`template-id.ts`](../../../../../packages/libs/dota-rendering/src/template-id.ts) | `templateId(strings)` is an FNV-1a hash designed to be "shared by build and browser runtimes". `MARKER_VERSION` and the `data-dh-*` attribute names are exported constants. |
| Dynamic values reach children as attributes | `applyAttribute` in [`renderer.ts`](../../../../../packages/libs/dota-rendering/src/renderer.ts) | Interpolations are quoted attribute strings, and Dota Core converts them through `@Property` types. A child component's inputs are therefore fully described by its tag and attributes, which serialize. |
| Light DOM is the norm | 97 of 98 `shadow:` settings in Dota Web, `dota-ui`, and `dota-md` are `shadow: false` | Nesting components is string concatenation. No declarative shadow DOM is needed for almost everything. |
| Property metadata is readable without a DOM | `Metadata.for(Class)`, used by `observedAttributes` | Attribute-to-property mapping comes from decorators, not from an element instance. |
| A runtime plugin socket | `DotaRuntimePlugin`, `setMountStrategy`, `wrapRouteRenderer` in `dota-runtime` | A server renderer can be an opt-in plugin, as `dotaHydration()` is on the client. Note: the current `MountStrategy` returns a DOM-bound `MountResult`, so a string path needs its own entry point, not this slot. |
| Everything after HTML production | route discovery (`ssr: true`), Vite plugin, deployment configs, hydration plugin | Unchanged by a new HTML producer. Only what turns components into a string changes. |
| The roadmap already names it | `dota-core-rendering-hydration-architecture-roadmap.md` proposes `renderToString(view)` in a separate `@ayu-sh-kr/dota-core/server` entry and "pure view functions" | This is the planned direction, not a fight with the architecture. |
| Marker output is deterministic | host `data-dh-c/t/v/s`, per-element `data-dota-index`, `data-dota-dynamic`, `data-dh-a`, comments `dh:<scope>:pN` and `<!--dota-component-start/end-->` | The static parts depend only on a template's `strings`, so they can be computed once per template and cached. |

## Evidence: how DOM-free is `render()` today?

I called `render()` on a fresh instance of every custom element Dota Web registers (87), wrapping the
instance and the browser globals (`document`, `window`, `localStorage`, `matchMedia`, `getComputedStyle`,
`navigator`, `location`, `history`) in recording proxies.

| Result | Components |
| --- | --- |
| Registered | 87 |
| `render()` returned a template with default state | 86 |
| Touched neither the DOM tree nor a browser global | **79** |
| Of those, read only attributes (`getAttribute`, `dataset`, and similar) | 4 |
| Read the DOM tree (`innerHTML`, `querySelector`, `children`, layout) | 0 |
| Touched a global | 7: `blog-pagination` and `blog-section` (`localStorage`), `blog-view`, `docs-page`, `docs-index-page` (`window`), `dark-mode-button`, `orb-background` (`document`) |
| Threw with default state | 1: `blog-icon`, which needs a prop that is set by its parent |

Limits of this probe: it renders with default, unconnected state, so branches that depend on later
state were not exercised; it does not cover constructors or lifecycle hooks; and the proxies record
reads, not whether the read changes output. It shows `render()` is mostly pure, not that a whole page
would match.

Other counts from the source (components in Dota Web, `dota-ui`, `dota-md`):

- `this.innerHTML` read in a constructor: `blob-wrapper` takes its own children as content. Nested
  expansion must therefore pass a host's children markup in, not just attributes.
- `querySelector`, `addEventListener`, and observers appear mostly in event handlers and post-render
  code (for example `capability-section`, `reactive-section`), which is not needed to produce HTML.
- 26 `@BeforeInit` / `@AfterInit` hooks exist, and a handful of components load content over the
  network (`blog-view`, `docs-view`, `resource-content`, `doc-loader.service`, `icons.component`).
  Those determine page content, so the server needs an explicit data phase.
- `unsafeHTML` appears in two files (`blob-wrapper`, `md-view`), so trusted markup is rare.

## What is missing

1. **An element base for the server.** `BaseElement extends HTMLElement`, and its constructor and
   `connectedCallback` wire event managers, bind elements, and touch the DOM. The server needs
   `HTMLElement`, `Element`, `customElements`, `EventTarget` and a few observers as stand-ins, then
   a reduced lifecycle: construct, apply attributes through the same property conversion, run
   `@BeforeInit` and the data phase, call `render()`.
2. **Nested expansion.** After a parent's `render()`, custom-element tags in the output must be
   instantiated and rendered recursively, with their attributes and child markup. That needs an HTML
   tokenizer or a compile step, not regular expressions.
3. **Marker parity.** The output must match what the client hydration plugin checks: template id,
   marker version, scope, element indexes, and part markers. These are pure functions of the template,
   but they are currently produced by walking a parsed DOM fragment.
4. **Document-level state.** `DotaPageElement.updateSEO` writes into `document.head`. The router writes
   routes with `innerHTML`. The server needs a head model and a route entry that returns a string.
5. **Per-request state.** Services such as `ApplicationEventService.getInstance()` are singletons.
   Evaluating the application once for many requests would share them, so either each request
   evaluates the app (as in the [request-time benchmark](../performance/ssr-request-render-benchmark-2026-10-15.md))
   or the singletons become request-scoped.
6. **The seven global-touching components** and **the one shadow-DOM component** need guards or shims.

## External help

| Option | What it offers | Fit |
| --- | --- | --- |
| [`@lit-labs/ssr-dom-shim`][lit-shim] (moving to `@webcomponents/ssr-dom-shim`) | Node-only stand-ins for `Element`, `HTMLElement`, `EventTarget`, `Event`, `CustomEvent`, the three observers, `CustomElementRegistry`, and `customElements`. It sets no globals itself. | Good for item 1. Small, intended for exactly this, and used with libraries other than Lit by assigning to `globalThis` or through an export condition. |
| [`parse5`][parse5] (version 7.3.0 is already in the workspace's package store through another dependency) | Spec-compliant HTML parser and serializer with a pluggable tree and optional source locations. | Good for items 2 and 3, to find component tags and static structure once per template. Adds a dependency to the server entry. |
| [Lit SSR][lit-ssr] | Precedent: server rendering that does not emulate the full DOM, relying on the declarative template format; also isolates requests in VM contexts. | Design reference only. It is experimental and tied to Lit's template format. |
| [Declarative Shadow DOM][dsd] | Standard way to emit shadow trees in HTML. | Only needed for the single `shadow: true` component and future shadow users. |
| LinkeDOM | Lighter DOM, measured 2.2–3.5 times faster than happy-dom on DOM work in the [DOM benchmark](dom-engine-benchmark-2026-10-13.md). | A smaller step on the current design, not a string renderer. Needs adapters for `location`, `history`, `getComputedStyle`, `XMLSerializer`. |

Nothing external replaces Dota's own template renderer, but the shim and parser cover the two
parts that are generic.

## Possible approaches

Ordered by how little they change the architecture. None has been built.

1. **Keep happy-dom, fix packaging** (done in the benchmark report). Correct today; DOM cost stays.
2. **Swap the DOM engine to LinkeDOM.** Contained change; saves an estimated 5–8 ms per route.
3. **Hybrid string renderer with a fallback.** Add a server entry that renders string-capable
   components directly and falls back to happy-dom for a route whose component graph includes an
   unsupported one. A component would declare or be detected as string-capable. Most of Dota Web's
   pages could take the fast path from day one, and unsupported components stay correct. This is the
   path I would prototype first.
4. **Compile templates at build time.** Replace per-render parsing with a build step that turns each
   template into static segments plus part descriptors (the idea behind Lit-style SSR templates).
   Largest gain and largest change; worth it only after approach 3 shows the shape.

## How to prove it safely

The happy-dom pipeline is already an oracle: render every route with both engines and diff the
normalized HTML, as the benchmark did for the prebuilt bundle (10 of 10 routes identical after
normalizing icons and random ids). A string renderer should land only with:

- route-by-route output equality against happy-dom, including all `data-dh-*` markers and comments;
- the existing hydration plugin adopting the string output with no mismatch warning in a browser;
- a unit-test corpus built from the 87 components' `render()` results.

## What it would and would not buy

Not measured. From the request-time benchmark, a warm render took about 22 ms (module evaluation
about 11 ms, settling about 8 ms, cleanup and serialization about 3 ms) and a cold worker about 154 ms,
of which importing happy-dom and the libraries was about 78 ms. A string renderer removes DOM work and
part of the import cost but not module evaluation or data loading, so a gain is plausible but unproven,
perhaps a few milliseconds warm and more on cold starts. Treat those as hypotheses.

Likely benefits that are not about speed: no per-request window and no global swap (so concurrent
renders in one thread become possible), lower memory per request, and a smaller server bundle.

## Recommended next step

Prototype approach 3 on one real route (for example `/docs/router`): a minimal server element base on
the Lit shim, `parse5` for nested expansion, marker generation cached per `templateId`, and a
byte-for-byte comparison against the happy-dom output. Report time per route and cold start against
the baselines in the benchmark report before deciding anything larger.

## Sources

- [Lit SSR overview][lit-ssr] and [`@lit-labs/ssr-dom-shim`][lit-shim] — DOM stand-ins for server rendering.
- [parse5][parse5] — WHATWG-compliant HTML parser used by other tooling.
- [Declarative Shadow DOM][dsd] — server-emitted shadow trees; browser support listed there.

[lit-ssr]: https://lit.dev/docs/ssr/overview/
[lit-shim]: https://www.npmjs.com/package/@lit-labs/ssr-dom-shim
[parse5]: https://github.com/inikulin/parse5
[dsd]: https://web.dev/articles/declarative-shadow-dom
