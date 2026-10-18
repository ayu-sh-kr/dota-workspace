# Server rendering, one small piece at a time

You do not need to know SSR to start here. Follow one page, `/tasks/42`, from a URL to visible HTML, then to an interactive component. Each lesson answers one question and introduces the terms it needs.

**The central idea:** the same Dota component can produce HTML before the browser runs your app. *When* that happens distinguishes SSR from SSG. The browser still has work to do afterward.

**New to SSR? [Begin with lesson 1: From URL to HTML →](/docs/ssr-html-first)**

## Choose a short read

| Read in order | You will be able to explain |
| --- | --- |
| [1. From URL to HTML](/docs/ssr-html-first) · about 4 min | What the browser receives; CSR, SSR, SSG, and hydration without framework jargon. |
| [2. A server-ready component](/docs/ssr-component) · about 5 min | A complete example, decorators, properties, data loading, and the symbols in the code. |
| [3. Inside one SSR request](/docs/ssr-request) · about 5 min | Application capture, route matching, request state, recursive components, SEO, and the response. |
| [4. Templates become HTML](/docs/ssr-templates) · about 4 min | What is reused, what was added, escaping, template plans, and hydration markers. |
| [5. SSG: render at build time](/docs/ssr-static-build) · about 5 min | Why SSG takes a different execution path, readiness, fetches, workers, and output files. |
| [6. Make HTML interactive](/docs/ssr-hydration) · about 5 min | Adoption versus mounting, the initial route, client-only placeholders, events, and updates. |
| [7. Build and serve a mixed app](/docs/ssr-hosting) · about 4 min | Wrap configuration, standalone SSR, static-file precedence, and hosting targets. |
| [8. Packages and server limits](/docs/ssr-package-map) · about 6 min | Who owns each part, the minimal server DOM, request isolation, and debugging checkpoints. |

These are focused explanations, not a tour of Dota Web's content pages. Dota Web appears only where it provides a real integration example.

## See the three timelines

![Three timelines: CSR builds content in the browser, SSR builds content for a request, and SSG builds content before requests.](./rendering-modes.svg)

## Keep these distinctions beside you

| Question | Answer |
| --- | --- |
| Who creates the **initial page content**? | CSR: the browser. SSR: a server handling the request. SSG: a build process. |
| Does SSR mean a different template language? | No. Dota reuses `html` templates; a server serializer writes them as HTML. |
| Is hydration another rendering mode? | No. It is browser-side work that reconnects compatible existing HTML to component updates and events. |
| Does `mode: 'ssr'` make every navigation contact a server? | No. Later in-app navigation uses the normal browser router. |
| Does SSG call the SSR data hook? | No. This implementation runs normal app startup in Happy DOM rather than the request-time string adapter. |

> **Reading the pictures:** arrows show the order of work. Boxes name operations or results. A branch labels an actual choice. HTML examples that omit Dota's bookkeeping attributes are explicitly marked “simplified”; do not copy marker examples as configuration.

## When you need the exact file

Use the [complete file and function reference](/docs/ssr-file-reference) after a lesson, or while changing the implementation. It preserves the detailed branch walkthrough, source links, per-file descriptions, function tables, tests, and packaging notes. It is a lookup document, not the prerequisite for understanding SSR.

**Start with [1. From URL to HTML →](/docs/ssr-html-first).**
