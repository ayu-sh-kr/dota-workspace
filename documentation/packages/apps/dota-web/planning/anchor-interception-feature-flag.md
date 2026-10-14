# Anchor interception feature flag

> **Status: proposal.** Nothing described here is implemented. Today every internal anchor click in
> Dota Web loads a new HTML document.

Anchor interception would let Dota Web turn eligible internal link clicks into client-side route
changes while the links stay real anchors with a valid `href`. It would ship behind a feature flag
so it can be enabled, compared, and removed without touching the markup.

## Context and intent

`DomHistoryRouter` handles `routerService.route()` and `popstate`, but not anchor clicks
(`packages/libs/dota-router/src/router/history/dom-history.router.ts`). A click on a link such as
`<a href="/docs/getting-started">` therefore performs a full document navigation: the shell
disappears, the bundle reloads, and the application initializes again.

Real anchors are kept because they expose the destination to search engines, give links meaningful
text, and keep copy-link and open-in-new-tab working. The flag only adds an enhancement on top of
them.

The white flash that appears during that reload is a separate problem. It is handled by the inline
theme script in `packages/apps/dota-web/index.html` and does not depend on this flag.

## Proposed behavior

When the flag is on, the application registers one delegated `click` listener on `document` after
`applicationReady` resolves, so `routerService` exists. For each click it finds the nearest
`a[href]` and calls `event.preventDefault()` followed by `routerService.route(path)` only if all of
these hold:

- `event.defaultPrevented` is false and the button is the primary one (`event.button === 0`).
- No `metaKey`, `ctrlKey`, `shiftKey`, or `altKey` is pressed.
- The anchor has no `download` attribute and its `target` is empty or `_self`.
- `anchor.origin === location.origin`.
- The link is not hash-only on the current path; the browser keeps native fragment scrolling.
- The path is one the router can resolve, so the link does not swallow files such as images.

Every other click keeps the browser's native behavior. Before the application is ready, or when the
flag is off, links work as they do today.

For same-path links with a hash and for cross-path links with a hash, the existing global
`afterEach` hook in `src/main.ts` already skips scroll-to-top when `context.url.hash` is set. The
implementation must confirm the target element is scrolled into view after the new route renders.

## Configuration

The flag is a build-time Vite variable, matching how `VITE_OPEN_AI_KEY` is read in
`src/service/OpenAIService.ts`:

```sh
VITE_ANCHOR_INTERCEPTION=true
```

It defaults to off. A build-time flag is preferred for now because the SSG output is identical
either way (the anchors are the same) and no runtime store is needed. A runtime switch can be added
later if staged rollout is needed.

## Constraints and edge cases

- **Hydration.** Prerendered pages must hydrate before any click is intercepted; registering the
  listener after `applicationReady` ensures this.
- **Guards.** `route()` runs guards before `pushState`. A rejected navigation must not fall back to
  a full load, or the user would see the page reload anyway.
- **Router duplicates.** `DomHistoryRouter.init()` must not be re-run to register this listener;
  the click handler belongs to the application, not the router, until the behavior proves stable.
- **Moving to the router.** If the flag is retired, the logic is a candidate for a router option so
  other consumers get it. That would need a changeset for `dota-router`.
- **Direct visits and refreshes** are unaffected: they still serve the destination document and
  rely on the early theme script to avoid a white first frame.

## Verification plan

- Unit tests for the eligibility predicate: plain click, each modifier, middle click, `download`,
  `target="_blank"`, external origin, hash-only, and non-route paths.
- Browser check on the docs sidebar with the flag on and off: no new document request on click,
  correct `history` entries, back and forward working, and hash links scrolling to their target.
- `pnpm --filter dota-web run test` and `pnpm run build:ssg` in `packages/apps/dota-web`.

## Related documentation

- [Hydration and SSR documents](../../../../standards/hydration-ssr)
