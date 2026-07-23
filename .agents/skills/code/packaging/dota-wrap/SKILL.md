---
name: dota-wrap-packaging
description: Use when changing packages/libs/dota-wrap packaging, exports, dependency boundaries, or build/release behavior so consumers only install @ayu-sh-kr/dota-wrap and the wrapper keeps its internal runtime and bundled plugin split intact.
---

# Dota Wrap Packaging

Use this skill for any change under `packages/libs/dota-wrap` that affects package metadata, exports, build scripts, declaration generation, or dependency classification.

## Packaging policy

- `@ayu-sh-kr/dota-wrap` is the consumer-facing package. Client code should install and import the wrapper, not its internal packages directly.
- Treat `@ayu-sh-kr/dota-core`, `@ayu-sh-kr/dota-event`, `@ayu-sh-kr/dota-router`, and `@ayu-sh-kr/dota-rest` as internal runtime dependencies. Keep their public subpath exports intact, and preserve singleton/runtime sharing across wrapper entry points.
- Treat `@ayu-sh-kr/dota-preloader-plugin` and `@ayu-sh-kr/dota-web-type-json` as bundled build-time plugins. They belong in the wrapper build output and should not become consumer-managed deps.
- When adding a new surface, decide its bucket first:
  - runtime API: add or adjust a subpath export and keep the underlying package wired through the wrapper;
  - build-time plugin/helper: bundle it and expose it through a wrapper subpath;
  - internal implementation detail: keep it out of the public export map.

## Change workflow

1. Inspect `packages/libs/dota-wrap/package.json`, `scripts/build.mjs`, `vite.config.ts`, and the `src/*` barrels.
2. Update the correct dependency bucket before changing the export surface.
3. Keep `dist` entry generation and declaration rewriting aligned with the final export map.
4. Verify the published contract still lets consumers depend on `@ayu-sh-kr/dota-wrap` alone for core APIs and plugins.
5. If the public surface changes, update the changelog or changeset entry with the dependency impact.
