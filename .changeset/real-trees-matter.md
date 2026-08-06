---
"@ayu-sh-kr/dota-preloader-plugin": patch
"@ayu-sh-kr/dota-rendering": patch
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-core": patch
"@ayu-sh-kr/dota-wrap": patch
"@ayu-sh-kr/dota-ssr": patch
"@ayu-sh-kr/dota-md": patch
"@ayu-sh-kr/dota-ui": patch
"@ayu-sh-kr/dota-ast-utils": patch
---

Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

- `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
- `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
- Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.
