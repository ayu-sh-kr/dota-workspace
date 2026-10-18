# 4. Templates become HTML

**Question:** did SSR reuse Dota's templating, modify hydration, or invent a separate renderer?

**Short answer:** it reuses the existing structured template language, adds a server HTML writer, and extends the browser integration to recognize and reuse the server's output. These are different responsibilities.

## One template, two consumers

```ts
import {html} from '@ayu-sh-kr/dota-wrap/rendering';

const title = 'Fix <button>';
const output = html`<h1>${title}</h1>`;
```

The `html` tag returns a **TemplateResult**: static string segments plus dynamic values. Think of it as a description, not a DOM tree or a completed HTML string.

```text
Static segments: ['<h1>', '</h1>']
Dynamic values:  ['Fix <button>']

Browser consumer → DOM elements and updateable parts
Server consumer  → escaped HTML text and optional hydration markers
```

The existing browser renderer owns DOM creation, parts, updates, keyed lists, and adoption. The server consumer in `dota-rendering/server` owns serialization. `dota-ssr` decides *when and which components* to render, then delegates template writing to Rendering.

| Concern | What the branch does |
| --- | --- |
| `html`, structured results, existing directives | Reuses the existing contract rather than adding a server template language. |
| Server serializer, tokenizer, template plan | Adds a server implementation under Rendering's `/server` entry. The serializer was moved out of SSR as part of this separation. |
| Marker format and template identity | Shares durable metadata so the browser can identify what it is receiving. |
| Browser hydration and initial-route handling | Extends integration; it is not a wholesale rewrite of all rendering. |

## Serialization must preserve meaning

**Serialize** means encode a value into a form that can be stored or transmitted. Here the result is HTML text.

```html
<!-- Without hydration markers, the template above produces: -->
<h1>Fix &lt;button&gt;</h1>
```

Escaping turns `<` into `&lt;`, so the title remains text rather than creating another element. Dynamic text and quoted attribute values are escaped. Quote dynamic attributes explicitly:

```ts
html`<a href="${url}">${label}</a>`;  // supported shape
```

This does not validate that a URL is safe for your application's use. Escaping syntax and validating untrusted content are different jobs. Dynamic tag names and dynamic attribute names are not supported by the server template planner.

`unsafeHTML` and `trustedHTML` opt into raw HTML behavior; neither sanitizes input. `unsafeHTML` participates in structural template composition, while `trustedHTML` supplies a dynamic child. Do not use either for arbitrary user content. `nothing` means no rendered content. Existing `when` and `keyed` directives are handled recursively; duplicate keyed entries are an error.

## Why a tokenizer and a plan exist

A **tokenizer** reads HTML-like source into meaningful pieces: start tags, end tags, attributes, comments, and text. It prevents a fake `<task-page>` inside a script from being treated as a component.

A **template plan** records how a particular static template is written: where dynamic children and attributes belong, and where markers are valid. It is cached by the template's static strings so repeated renders do not repeat all that analysis. This lexical machinery is not a full browser HTML parser or layout engine.

The planner accounts for some browser normalization, such as implied table bodies. Raw-text/RCDATA and inert-template positions cannot always carry adoptable dynamic parts. Unsupported adoption can warn and remount, or fail under strict mismatch handling. “It is HTML” does not guarantee every unusual template position can be hydrated.

## Markers are a map, not visible content

```html
<!-- Illustrative bookkeeping for one structured host. Hash abbreviated. -->
<task-page data-dh-c="task-page" data-dh-t="HASH" data-dh-v="2" data-dh-s="h0">
  <h1><!--dh:h0:p0-->Task 42<!--/dh:h0:p0--></h1>
</task-page>
```

| Symbol | What it tells the browser |
| --- | --- |
| `data-dh-c` | The component selector this identity belongs to. |
| `data-dh-t` | A hash identifying the template's static shape, not its current text values. |
| `data-dh-v` | The template identity format version; currently `2`. |
| `data-dh-s="h0"` | This host's scope, so nested components' parts do not collide. |
| `p0` | A dynamic part's index within the scope. |
| `<!--dh:...-->` / `<!--/dh:...-->` | Start/end HTML comments delimiting a child part; comments are not painted as text. |

Dynamic attributes have their own `data-dh-a` tokens. Keyed ranges have additional markers so entries can retain identity when reordered. The initial route marker is a separate protocol with its own version; do not confuse it with `data-dh-v`.

You never author these attributes manually. The server emits them and the browser validates them. A mismatch means the server's map may not describe the browser template; mounting fresh is safer than silently attaching updates to the wrong nodes.

> **Two independent responsibilities:** markers locate dynamic regions; property reflection transfers supported values. A marker does not contain all application state. The browser still needs matching state for its first render.

**In the code:** [template-serializer.ts](../../../../../../packages/libs/dota-rendering/src/server/template-serializer.ts), [template-plan.ts](../../../../../../packages/libs/dota-rendering/src/server/template-plan.ts), [html-tokenizer.ts](../../../../../../packages/libs/dota-rendering/src/server/html-tokenizer.ts), [hydration-markers.ts](../../../../../../packages/libs/dota-rendering/src/hydration-markers.ts), and [renderer.ts](../../../../../../packages/libs/dota-rendering/src/renderer.ts).

**Next: [5. SSG: render at build time →](/docs/ssr-static-build)** · [Collection](/docs/ssg-ssr-csr)
