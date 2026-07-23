# Event map generator

This package is a Vite plugin scaffold for generating typed `ApplicationEventMap` declarations from Dota source files. The current implementation is intentionally narrow: it discovers event names, writes a declaration file, and leaves payload inference for a later iteration.

## Context and intent

The goal is to keep application event names in one generated declaration file instead of hand-maintaining scattered module augmentations. The scaffold is set up so the plugin can grow into richer generation logic without changing the package shape again.

## Behavior

`src/main.ts` returns a Vite plugin with two active paths:

- `buildStart()` eagerly regenerates the declaration file.
- `configureServer()` registers watcher handlers for `add`, `change`, and `unlink`, then regenerates and forces a full reload when a relevant source file changes.

The scanner in `src/scan/EventMapScanner.ts`:

- resolves each scan root against the plugin root,
- discovers `./src/**/*.ts` files,
- ignores `*.d.ts`,
- parses each file with SWC,
- uses shared AST helpers from `@ayu-sh-kr/dota-ast-utils` to read decorator names, string arguments, and object-property strings,
- extracts event names from `@OnEvent("...")`,
- extracts event names from `publish({ name: "..." })` and `publishAsync({ name: "..." })`,
- deduplicates candidate names, then sorts them.

`src/generate/EventMapDeclarationUtils.ts` turns those names into a module augmentation for `@ayu-sh-kr/dota-wrap/event`. At this stage it emits `unknown` payloads, which is enough to establish the generated contract and keep the package iteration-ready.

## Configuration or usage

The plugin accepts the following options:

- `root` to override the resolved Vite root,
- `outFile` to choose the generated declaration path,
- `scanRoots` to add more source roots,
- `moduleSpecifier` to change the augmentation target,
- `logType` to control consola verbosity.

The default output path is `src/event-map.d.ts`.

## Constraints and edge cases

- The test fixture does not depend on real `@ayu-sh-kr/dota-wrap` or `@ayu-sh-kr/dota-event` runtime packages. It uses a local `.d.ts` shim so the scanner can see realistic import syntax without adding runtime coupling.
- Declaration files are ignored during scanning so the plugin does not consume its own generated output.
- Shared AST micro-policies such as decorator string extraction and object-property string lookup live in `@ayu-sh-kr/dota-ast-utils`; the plugin keeps only scan orchestration and event-map generation.
- The current generator does not infer payload types; all generated event entries map to `unknown` until that work is added in a later iteration.

## Related documentation

- [SVG flow diagram](./event-map-generator-flow.svg)
- [SVG flow diagram grammar](../../../../standards/svg-flow-diagram-grammar.md)
