# Event map generator

This package is a Vite plugin for generating typed `ApplicationEventMap` declarations from Dota source files. It discovers event names, resolves syntax-proven constants across the parsed scan graph, recovers payload evidence, and writes declaration and optional source-location artifacts.

## Context and intent

The goal is to keep application event names in one generated declaration file instead of hand-maintaining scattered module augmentations. The scaffold is set up so the plugin can grow into richer generation logic without changing the package shape again.

## Behavior

`src/main.ts` returns a Vite plugin with two active paths:

- `buildStart()` eagerly regenerates the declaration file.
- `configureServer()` registers watcher handlers for `add`, `change`, and `unlink`, then regenerates and forces a full reload when a relevant source file changes.

The scanner in `src/scan/EventMapScanner.ts`:

- resolves each scan root against the plugin root,
- discovers configured TypeScript source files,
- ignores `*.d.ts`,
- parses each file with SWC,
- uses shared AST helpers from `@ayu-sh-kr/dota-ast-utils` to resolve literals, constants, static members, aliases, and supported re-export paths,
- extracts event names from `@OnEvent(...)`,
- extracts event names from `publish({ name: ... })`, `publishAsync({ name: ... })`, and `emit(...)`,
- forwards Vite aliases and optional source extensions to the syntax-only resolver,
- deduplicates candidate names, then sorts them.

`src/generate/EventMapDeclarationUtils.ts` turns those candidates into a module augmentation for `@ayu-sh-kr/dota-wrap/event`. Publisher payloads are recovered syntactically from literals, typed bindings, explicit same-module callable returns, and type assertions; unresolved publisher payloads remain `unknown`, while decorator-only observations retain an `any` fallback and never infer a payload from handler internals.

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
- Dynamic or unresolved event expressions remain skipped, with optional resolver reason diagnostics; the generator never emits the identifier text as an event key.

## Related documentation

- [SVG flow diagram](./event-map-generator-flow.svg)
- [Payload type resolution](../matching/payload-type-resolution.md)
- [SVG flow diagram grammar](../../../../standards/svg-flow-diagram-grammar.md)
