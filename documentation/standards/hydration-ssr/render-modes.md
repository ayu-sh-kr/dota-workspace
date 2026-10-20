# Render modes

Routes declare where their HTML is produced, and components can opt out of server output. The
values live in Dota Core so the router, the Vite preloader, SSG, hydration, and any SSR adapter read
one contract instead of each interpreting their own flags.

## Context and intent

Routes previously had one switch, `@Route({ssr: true})`, which meant "prerender at build time". That
cannot express request-time rendering, and components had no way to stay out of server HTML. Without
an opt-out, a component that depends on browser state is either rendered with the wrong state or
breaks hydration. The mainstream frameworks give two levels of control: a render mode per route and
a client-only opt-out per component. Dota follows the same shape.

## API

```ts
@Route({path: '/blog', mode: 'ssg'})          // build-time HTML
@Route({path: '/account', mode: 'ssr'})       // per-request HTML (needs a server adapter)
@Route({path: '/editor', mode: 'csr'})        // browser only
@Route({path: '/legacy', ssr: true})          // unchanged; resolves to 'ssg'

@Component({selector: 'consent-notice', mode: 'csr'})   // never in server output
```

| Field | Values | Default | Resolver |
| --- | --- | --- | --- |
| `@Route({mode})` | `'ssr' \| 'ssg' \| 'csr'` | `ssr: true` → `'ssg'`, otherwise `'csr'` | `resolveRouteRenderMode(route)` |
| `@Component({mode})` | `'inherit' \| 'csr'` | `'inherit'` | `resolveComponentRenderMode(component)` |

`mode` takes precedence over `ssr`. The legacy flag stays supported and keeps its meaning.

## Behavior

1. **Route selection.** The preloader reads `mode` and `ssr` from source without executing it and
   emits both into `virtual:dota-routes` and the route metadata module. `dotaSsg({autoDetectRoutes})`
   prerenders only routes that resolve to `ssg`. `ssr` routes are left to a request-time adapter, and
   `csr` routes ship the client shell.
2. **Server render flag.** A server render calls `setServerRender(true)` (SSG sets the same global
   symbol in its virtual entry) and clears it when the route finishes. `isServerRender()` reads it.
   The flag is a `Symbol.for` global, so every loaded copy of Dota Core agrees on it.
3. **Inheriting components** render wherever their page renders, and hydrate through the installed
   mount strategy as before.
4. **Client-only components during a server render.** `BaseElement` skips `render()`, leaves the
   host empty, and marks it with `data-dota-csr`. Later `updateHTML()` calls are ignored, so nested
   components never reach the output either.
5. **Client-only components in the browser.** `BaseElement` bypasses the mount strategy, so hydration
   never tries to adopt the empty host. It removes the marker and mounts fresh with the default
   renderer. No mismatch is reported, and `HYDRATED` does not fire.

## SSR adapter integration

A request-time adapter, such as the light-DOM string adapter prototype, follows the same contract:

- choose pages whose route resolves to `ssr` (or `ssg` when rendering on demand);
- call `setServerRender(true)` for the render, so components and lifecycle code see one flag;
- for a host whose component resolves to `csr`, emit `<tag data-dota-csr …attributes></tag>`
  without calling `render()` or descending into it.

The browser then needs nothing adapter-specific: `BaseElement` handles the marked host as above.

## Constraints

- The build-side route selection in `dota-ssr` mirrors `resolveRouteRenderMode()` inline because the
  Vite plugin runs in Node without a DOM global and cannot load Dota Core.
- `mode` must be a string literal in `@Route`; the preloader reads source and cannot evaluate
  expressions.
- A parameterized `ssg` route, such as `@Route({path: '/docs/:slug', mode: 'ssg'})`, is prerendered
  through the concrete paths in the SSG `routes` option that match it. The build fails when no
  listed path matches, because the route would otherwise never be generated.
- Client-only components produce no server content, so they should not hold content needed for SEO
  or first paint.
- Hydration per component (`load`, `visible`, `none`) is not part of this API yet.

## Related documentation

- [Hydration and SSR overview](./README.md)
- [Dota Core runtime environment](./dota-core-runtime-environment.md)
- [Buffered SSR and edge cache plan](../../packages/libs/dota-ssr/planning/buffered-ssr-and-edge-cache.md)
