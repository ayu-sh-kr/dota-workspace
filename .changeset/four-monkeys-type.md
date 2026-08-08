---
"@ayu-sh-kr/dota-rendering": patch
"@ayu-sh-kr/dota-wrap": patch
"@ayu-sh-kr/dota-ssr": patch
---

Improve Dota's opt-in hydration handoff so nested components and the initial
route can retain server-rendered DOM safely. This is a patch release for
client-only applications. Applications that prerender pages must rebuild and
deploy their static HTML together with the browser bundle because durable marker
format version 2 is not compatible with version 1 output.

- `@ayu-sh-kr/dota-rendering` now gives every statically rendered component a
  `data-dh-s` scope. Child, keyed, and dynamic-attribute markers include that
  scope, so a parent renderer adopts only its own markers and cannot consume
  nested component state. Structural client remounts remove the scope and the
  other build-only host markers.
- Added `deferRender()`, which lets an integration retain already-committed DOM
  until the component receives its first client update. Once activated, it uses
  the ordinary render-session patching and disposal behavior.
- `@ayu-sh-kr/dota-ssr` now validates the component scope alongside the template
  identity and marker version before hydrating. A stale or incomplete host still
  follows the configured mismatch policy: warn and remount that host by default,
  or throw when `mismatch: 'throw'` is selected.
- The SSG renderer marks the settled initial route with a versioned route marker.
  Browser startup captures the root and page before custom-element upgrade,
  retains both through the matching initial route transition, applies route SEO,
  and then releases ownership for normal later navigation. Legacy template-marked
  output remains accepted during the transition.
- `@ayu-sh-kr/dota-wrap` continues to expose these hydration capabilities through
  its existing SSR integration surface; no import migration is required.
