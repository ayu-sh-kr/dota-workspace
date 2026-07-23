---
"@ayu-sh-kr/dota-event-map-generator": patch
"@ayu-sh-kr/dota-ast-utils": patch
"@ayu-sh-kr/dota-wrap": patch
---

This patch release adds typed application-event map generation across the Dota tooling
stack:

- `@ayu-sh-kr/dota-event-map-generator` adds a Vite plugin that scans configured
  TypeScript roots for `@OnEvent` listeners and `publish`, `publishAsync`, or `emit`
  calls. It generates an `ApplicationEventMap` augmentation with recoverable payload
  types, defaults to `src/event-map.d.ts`, and can optionally emit source-location JSON
  for editor and tooling navigation.
- `@ayu-sh-kr/dota-ast-utils` adds reusable AST views and syntax-based type-resolution
  helpers for inspecting calls, objects, decorators, class methods, source offsets, and
  TypeScript annotations without creating a full TypeScript program.
- `@ayu-sh-kr/dota-wrap` exposes the event-map generator at the
  `@ayu-sh-kr/dota-wrap/event-map-generator` subpath and bundles it with the wrapper so
  consumers can configure it alongside the other Dota Wrap plugins.
