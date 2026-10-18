# 2. A server-ready component

**Question:** what must a component provide so the server and browser can both use it?

**You will learn:** a small working page, serializable properties, server and browser data hooks, and the syntax used throughout this collection.

## Keep one example in mind

This complete page displays the ID in `/tasks/42`. It deliberately does not fetch an API yet. Save it with your page components and let the preloader discover it, or register it explicitly in `initializeApp`.

```ts
import {
  AfterInit, Component, DotaPageElement, Property, String, type SEO,
} from '@ayu-sh-kr/dota-wrap/core';
import {Route} from '@ayu-sh-kr/dota-wrap/router';
import {html} from '@ayu-sh-kr/dota-wrap/rendering';
import type {RenderContext} from '@ayu-sh-kr/dota-ssr/server';

@Route({path: '/tasks/:id', mode: 'ssr'})
@Component({selector: 'task-page', shadow: false})
export class TaskPage extends DotaPageElement {
  @Property({name: 'task-id', type: String})
  taskId = '';

  constructor() { super(); }

  get seo(): SEO {
    return {title: `Task ${this.taskId}`, description: 'Task details'};
  }

  serverLoad(context: RenderContext) {
    this.taskId = context.params.id;
  }

  @AfterInit()
  initializeFromBrowserUrl() {
    if (!this.taskId) {
      this.taskId = location.pathname.split('/').at(-1) ?? '';
      this.updateHTML();
    }
    this.updateSEO();
  }

  render() {
    return html`<h1>Task ${this.taskId}</h1>`;
  }
}
```

The `RenderContext` import is **type-only**: TypeScript removes it from emitted browser JavaScript. It does not load the server runtime into the browser. Wrap remains the consumer-facing runtime API; the explicit server contract lives in `dota-ssr/server`. With pnpm's strict dependency layout, declare `@ayu-sh-kr/dota-ssr` as a direct dev dependency to use this type import: a transitive dependency through Wrap is not automatically importable. The current Wrap SSR entry does not re-export this server type.

## Read the code in four pieces

**1. Declare identity.** `@Component` associates a class with `<task-page>`. `shadow: false` puts rendered children directly inside that element. `@Route` associates a URL pattern with the page. A decorator is metadata attached to a declaration; it does not itself answer an HTTP request.

**2. Prepare state.** `taskId` is an instance field. `@Property` connects the JavaScript field `taskId` with the HTML attribute `task-id`. SSR seeds incoming attributes, awaits `serverLoad`, then reflects supported property values back into attributes.

```html
<!-- Simplified SSR output; bookkeeping markers omitted. -->
<task-page task-id="42" path="/tasks/42">
  <h1>Task 42</h1>
</task-page>
```

**3. Describe output.** `render()` reads prepared state and returns an `html` template. Keep it **pure**: describing the same state should produce the same output without starting fetches or changing external state. The same description can be serialized on the server or rendered in the browser; it should not depend on layout measurements.

**4. Handle the other startup path.** `serverLoad` runs in request-time string SSR, not in the browser or the current SSG pipeline. `@AfterInit` handles ordinary browser/SSG startup. The guard avoids overwriting a value already transferred in the host's attribute. `updateHTML()` applies changed state; `updateSEO()` refreshes the browser title after the ID is available.

> **Host** means the outer component element, here `<task-page>`. **Instance** means one object constructed from `TaskPage`. HTML transfers attributes and content, not that JavaScript object. A plain field or `context.state` is not automatically serialized for the browser. Reflected property values are public HTML; never use them to transfer secrets.

## Understand the symbols

| Syntax in the example | Meaning |
| --- | --- |
| `@Component(...)`, `@Property(...)` | Decorators: record framework metadata. |
| `extends DotaPageElement` / `super()` | Inherit page behavior; initialize the parent class. |
| `get seo()` | A getter: compute metadata when code reads `instance.seo`. |
| ``html`...${this.taskId}...` `` | A tagged template; `${...}` is a dynamic value, not string concatenation performed by the server alone. |
| `context: RenderContext` | A TypeScript type annotation; `:` here is not a route parameter. |
| `!this.taskId` | True when this string is empty. |
| `?? ''` | Use an empty-string fallback only for `null` or `undefined`. |
| `type SEO` / `import type` | Compile-time contracts, removed from runtime code. |

## Add a server fetch when needed

Replace the simple `serverLoad` with an asynchronous version when the initial page needs API data:

```ts
// Method replacement inside a page with a decorated `title` property.
async serverLoad(context: RenderContext) {
  const response = await context.fetch(`/api/tasks/${context.params.id}`);
  if (!response.ok) throw new Error(`Task request failed: ${response.status}`);
  const task = await response.json();
  this.title = task.title;
}
```

`async` returns a promise; `await` waits for its result before proceeding. The adapter awaits this hook before `render()`. `context.fetch` resolves a relative string URL against the page request's origin. It does not create an API endpoint; your host must actually serve `/api/tasks/...`.

For SSG or browser navigation, put the corresponding load in the normal application initialization path and make it observable to SSG's readiness/settling mechanism. Do not assume adding `serverLoad` alone makes all three modes load data identically.

**In the code:** [string-adapter.ts](../../../../../../packages/libs/dota-ssr/src/ssr/string-adapter.ts) implements `renderHost` and property reflection; [BaseElement](../../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts) owns browser connection and updates. The [standalone playground components](../../../../../../packages/libs/dota-ssr/playground/light-dom/src/components.ts) show API loading, nested components, and a counter.

**Next: [3. Inside one SSR request →](/docs/ssr-request)** · [Collection](/docs/ssg-ssr-csr)
