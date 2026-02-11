# `@ayu-sh-kr/dota-vite-preloader`

A Vite plugin that **auto-discovers Dota components** (classes decorated with `@Component`) in your app source, then exposes them through a **virtual module import**.

This lets your app do:

```ts
import components from "virtual:dota-components";

await initializeApp({
  modules: components,
  // ...
});
```

…and have the plugin generate that module at dev/build time.

## What is a “virtual import”?

In Vite, a *virtual module* is an import ID that **doesn’t exist on disk**. Instead, a plugin intercepts that import and returns generated source.

This plugin uses:

- Public import ID: `virtual:dota-components`
- Resolved internal ID: `\0virtual:dota-components` (the `\0` prefix is a Vite convention that marks it as an internal/resolved virtual module)

When anything imports `virtual:dota-components`, Vite calls the plugin hooks to resolve and load the module.

## What the plugin generates

At load time, the plugin returns a synthetic ES module that looks like:

```ts
import { SomeComponent } from "./src/components/some.component.ts";
import { OtherComponent } from "./src/pages/other.page.ts";

export default [SomeComponent, OtherComponent];
```

So the default export is an **array of component constructors**, ready to be passed into `initializeApp({ modules })` (where `modules` can be an array of element constructors in `@ayu-sh-kr/dota-wrap`).

## How discovery works

1. On startup (`buildStart`), the plugin scans configured source globs using `fast-glob`.
2. Each matched file is parsed with `@swc/core` (TypeScript + decorators enabled).
3. It finds exported class declarations decorated with `@Component({ selector: "..." })`.
4. For each match, it records:
   - class name
   - file path
   - selector/tag name

> Note: the selector/tag name is currently used to validate “is this a Dota component” (and for logging). The generated virtual module primarily needs the class constructors.

## Caching behavior

- Scan results are cached in plugin scope (`cachedCandidates`).
- `buildStart` eagerly fills the cache.
- `load()` reuses cached results when possible.

This avoids re-scanning on every virtual module request.

## Logging

The plugin uses `consola` and supports configurable verbosity.

- Default: `info`
- Configure with `logType`

Logs include:

- how many components were found
- debug logs for each candidate
- parse failures (non-fatal)

## Configuration

The plugin export is a plugin factory:

```ts
export type PluginConfig = {
  root?: string;
  logType?: "silent" | "fatal" | "error" | "warn" | "log" | "info" | "success" | "debug" | "trace";
}

export default function dotaVitePreloader(config?: PluginConfig): Plugin;
```

### `root`

Root folder used for scanning. Defaults to `process.cwd()`.

### `logType`

Controls how verbose the plugin is. Defaults to `info`.

## Vite hooks implemented

- `resolveId(id)`
  - If `id === "virtual:dota-components"`, returns the resolved ID (`\0virtual:dota-components`).
- `load(id)`
  - If `id === "\0virtual:dota-components"`, returns the generated module source.
- `buildStart()`
  - Runs an initial scan and caches the candidates.

## Important notes / constraints

- Only **exported** class declarations are considered.
- Decorator parsing requires TypeScript + decorators; this plugin uses SWC with `decorators: true`.
- If a file fails to parse, it won’t fail the build; it logs an error and continues.
- Import paths are generated as relative paths and forced to start with `./`.

## Typical usage (in `vite.config.ts`)

```ts
import { defineConfig } from "vite";
import dotaVitePreloader from "@ayu-sh-kr/dota-vite-preloader";

export default defineConfig({
  plugins: [
    dotaVitePreloader({
      root: process.cwd(),
      logType: "info",
    }),
  ],
});
```

