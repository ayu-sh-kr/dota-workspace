# Source layout

The package separates Vite integration from static page generation:

```text
src/
  vite/              Build plugin, prerender Vite server, and Vercel configuration
  ssg/               Generation, rendering, workers, routes, assets, and fetch handling
  ssr/               Reserved for future server-side rendering
  index.ts           Browser hydration entry
  route-marker.ts    Markers shared by generation and hydration
```

The Vite plugin validates options and passes the completed client build to
`ssg/generate.ts`. Generation coordinates route discovery, rendering, output
writes, and timing logs. Vite server setup stays in `vite/prerender-server.ts`
and is shared by sequential rendering and isolated workers.

Tests follow the same `vite` and `ssg` ownership. The `ssr` directory contains
only `.gitkeep` so Git preserves the empty directory; no SSR runtime is added.

Public imports remain `@ayu-sh-kr/dota-ssr` for hydration and
`@ayu-sh-kr/dota-ssr/vite` for the build plugin. The worker export retains its
`@ayu-sh-kr/dota-ssr/worker` name and now resolves to `dist/ssg/render-worker.cjs`.
Applications do not need configuration changes for this restructure.

The [buffered SSR and edge-cache plan](../planning/buffered-ssr-and-edge-cache.md)
describes the proposed shared render lifecycle, Node function adapters, performance
measurement, and implementation order for adding request-time SSR alongside SSG.
