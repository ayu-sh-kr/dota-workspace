---
"@ayu-sh-kr/dota-core": minor
---

Add render modes to Dota Core. `@Component({mode: 'csr'})` keeps a component out of SSG and SSR output: during a server render its host stays empty and is marked `data-dota-csr`, and in the browser it mounts fresh instead of going through the hydration mount strategy.

- New `RouteRenderMode` (`'ssr' | 'ssg' | 'csr'`) and `ComponentRenderMode` (`'inherit' | 'csr'`) types.
- `resolveRouteRenderMode()` resolves `mode` first and maps the legacy `ssr: true` to `'ssg'`.
- `resolveComponentRenderMode()`, `setServerRender()`, `isServerRender()` and `CLIENT_ONLY_ATTRIBUTE` let routers and server adapters share one contract.
