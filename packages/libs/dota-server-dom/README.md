# @ayu-sh-kr/dota-server-dom

A minimal, DOM-free set of browser stand-ins for rendering web components on a
server. It provides just enough of `HTMLElement`, `Document`, `customElements`,
and the request-level browser globals for component modules to evaluate and
render to strings. It is not a full DOM: selector queries match nothing,
observers and animation frames never fire, and media queries never match.

Dota SSR's string renderer uses it through `@ayu-sh-kr/dota-ssr/server`; most
applications never import it directly. It has no runtime dependencies.

## Installation

```sh
pnpm add @ayu-sh-kr/dota-server-dom
```

## Entry points

| Entry | Purpose |
| --- | --- |
| `@ayu-sh-kr/dota-server-dom` | Pure constructors: `ServerElement`, `ServerDocument`, `ServerCustomElementRegistry`, and browser-object stand-ins. Importing it defines no globals. |
| `@ayu-sh-kr/dota-server-dom/install` | Side-effect import that defines `HTMLElement` and `customElements` when they are missing. |
| `@ayu-sh-kr/dota-server-dom/node` | `runInBrowserScope(url, task)`: request-scoped `document`, `location`, `history`, storage, and window events, isolated per render with `AsyncLocalStorage`. Node-compatible runtimes only. |

## Usage

Import `/install` before any module whose classes extend `HTMLElement`, because
those classes are created when the module is evaluated:

```js
import '@ayu-sh-kr/dota-server-dom/install';
import {runInBrowserScope} from '@ayu-sh-kr/dota-server-dom/node';

const {renderPage} = await import('./render-page.js');
const html = await runInBrowserScope(new URL('http://localhost/tasks/42'), () => renderPage());
```

Existing globals are never replaced. In a browser, under Happy DOM, or in a
runtime that already defines a global such as `localStorage`, that existing
value is used instead, so it is shared across requests rather than scoped to
one render.

A custom element's tag name comes from its `customElements` registration, or
otherwise from a static `__dotaSelector` property, which Dota Core's
`@Component` decorator sets.
