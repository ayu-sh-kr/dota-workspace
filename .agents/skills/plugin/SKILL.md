---
name: dota-vite-plugin
description: Build, extend, or review a Dota workspace Vite plugin that scans decorated source or call sites and generates artifacts. Use when creating a new plugin under packages/plugins/, or working on scanning, codegen, or the Vite lifecycle in dota-vite-preloader, web-type-json, or a new sibling such as the planned event-map generator. Applies standard Vite/Rollup plugin practice and routes to focused setup, scanning, artifact-generation, and build/watcher sub-skills.
---

# Dota Vite Plugin

Every plugin under `packages/plugins/` solves the same shape of problem: **scan
Dota source syntactically for a set of signals, then generate something from
what it finds** — a virtual module, a JSON artifact, or a `.d.ts`. Two plugins
exist today and a third is planned; they are variations on one anatomy, built on
standard Vite plugin practice. Follow the standard first, then the workspace
specifics below.

Read the two reference implementations before writing anything new:

- `packages/plugins/dota-vite-preloader/` — scans `@Component`/`@Route`, emits
  **virtual modules** (`virtual:dota-components`, `virtual:dota-routes`).
- `packages/plugins/web-type-json/` — scans `@Component`/`@Property`, writes
  **JSON artifacts** (Web Types + optional Custom Elements Manifest) and
  registers them in `package.json`.

The planned event-map generator
(`documentation/packages/libs/dota-event/planning/event-map-auto-generation-plugin.md`)
reuses this anatomy for `@OnEvent(...)` decorators and `publish(...)` **call
sites** — treat it as the canonical "the signal is not a component" case study.

## Standard Vite plugin practice (apply to every plugin)

A Dota plugin is an ordinary Vite plugin object. Honor the platform contract:

- **Naming.** The plugin object's `name` is `vite-plugin-<slug>` (Rollup/Vite
  convention, used in error frames and warnings). The npm package is
  `@ayu-sh-kr/<name>`.
- **Factory export.** Default-export a function returning a `Plugin` (or
  `Plugin[]`). Never export a bare plugin object — a factory lets callers pass
  options and keeps the plugin reusable.
- **Hook taxonomy.** Know which hooks you are using:
  - *Universal (Rollup) hooks* — `buildStart`, `resolveId`, `load`, `transform`,
    `buildEnd`. Run in both dev and build.
  - *Vite-specific hooks* — `config`, `configResolved`, `configureServer`,
    `handleHotUpdate`, `transformIndexHtml`. Prefer these for
    config/dev-server/HMR concerns.
- **Resolve config, don't assume it.** Capture `root`, `command`, and `mode`
  from `configResolved(config)` rather than reaching for `process.cwd()`. Accept
  an explicit `root` option as an override, but let Vite's resolved root be the
  default so the plugin works when the Vite root differs from the process cwd.
- **`apply` / `enforce`.** Set `apply: 'serve' | 'build'` when a plugin is only
  relevant to one command, and `enforce: 'pre' | 'post'` when ordering versus
  other plugins matters. Omit both when the plugin must run in every case in
  normal order.
- **Use the plugin context.** Inside hooks, prefer the Rollup context: `this.error`/`this.warn`
  for build-failing/soft diagnostics tied to a file, `this.addWatchFile(path)` so
  the build re-runs when a scanned file changes, and `this.emitFile(...)` for
  build outputs that belong in the bundle.
- **Purity and idempotency.** Hooks must be side-effect-free except where the
  plugin's job is to write (see `plugin-artifact-generation`). Running a hook
  twice with the same input must produce the same result. Return `null` from
  `resolveId`/`load`/`transform` for anything the plugin does not own.
- **ESM + types.** Ship ESM (and CJS for compatibility), a rolled-up `.d.ts`, and
  a typed options object.

## Shared workspace anatomy

1. **Options.** A config object with an optional `root` (defaults to the Vite
   resolved root) and `logType: LogType = 'info'`; add plugin-specific options
   beyond those.
2. **Logging.** `consola`: `createConsola({ level: LogLevels[logType], formatOptions: { date: true, colors: true } })`.
3. **Discovery.** `fast-glob` over the fixed scan globs, kept in a
   `ComponentScanPath` constants class.
4. **Parse.** `@swc/core`'s `parse(code, { syntax: "typescript", decorators: true })`,
   once per file. No TypeScript type checker, no `ts-morph` — everything is a
   syntactic AST scan.
5. **Traverse.** `@ayu-sh-kr/dota-ast-utils` fluent queries and `*View` wrappers.
   Extend that library when it lacks a traversal — do not hand-walk raw SWC nodes
   in the plugin (see `plugin-source-scanning`).
6. **Generate.** A pure function from scan metadata → output, kept independent of
   the Vite lifecycle so it is directly testable.
7. **Integrate.** `buildStart` for the eager build path; `handleHotUpdate` /
   `configureServer` for the dev refresh. Cache scan results in plugin scope.
8. **Package shape.** `type: module`, dual-format lib build + rolled-up `.d.ts`,
   `@dota` → `./src` alias in `tsconfig.json` and the Vite/Vitest configs, `vite`
   as a peer dependency.

## Sub-skills — route by task

| You are… | Use |
| --- | --- |
| Scaffolding a new plugin package (files, configs, factory skeleton) | `plugin-project-setup` |
| Reading source into metadata (parse + traversal + signal extraction) | `plugin-source-scanning` |
| Turning metadata into output (virtual module, emitted/written artifacts, `package.json` registration) | `plugin-artifact-generation` |
| Wiring the Vite lifecycle (hooks, caching, watcher, HMR, invalidation) | `plugin-build-watcher` |

Building a whole plugin touches all four in that order: set up → scan →
generate → wire. For test setup, defer to `vitest-package-setup`; for changeset
and release, `create-changeset`; for structural cleanup, `code-quality`.

## Conventions that apply everywhere

- **Logical grouping by job.** Keep the code for one job in one module named for
  that job: scanning one signal, serializing one output format, or one reusable
  policy. Keep the entry `main.ts` limited to orchestration and lifecycle wiring;
  it may re-export grouped public APIs without owning their implementation. Group
  files by the job they perform, not by file-type suffix, and mirror that grouping
  in the test tree.
- **Centralize literals.** Every magic string — decorator names, argument keys,
  scan globs, virtual IDs — lives in a `Constants.ts` class, never inlined in the
  scanner.
- **Deterministic output.** Sort candidates and their fields by stable keys so
  unchanged input produces byte-identical output; this keeps caches, HMR
  diffing, and snapshots reliable.
- **Fail soft on bad input.** A single unreadable/unparseable file must log and
  skip, never fail the whole run.
- **Preserve the public surface.** Both plugins re-export their factory as
  `default` and their pure functions (`scanWebComponents`, `resolveComponentExport`,
  …) as named exports for testing; keep that surface intact.
