---
name: plugin-project-setup
description: Scaffold a new Vite plugin package under packages/plugins/ in the Dota workspace to published-plugin standards. Covers package layout, package.json metadata and exports, tsconfig with the @dota alias and decorator options, the dual-format lib vite.config with dts, the Constants class, the plugin factory skeleton, config resolution, and dependency wiring. Use when creating a new plugin or repairing the build/package configuration of an existing one.
---

# Plugin Project Setup

Scaffold a new plugin by copying the structure of `web-type-json` (the newer,
more complete reference) or `dota-vite-preloader`, then bring it up to
published-plugin standards. Match workspace conventions exactly; only diverge
where the plugin's concern genuinely requires it.

## Package layout — group by job

```
packages/plugins/<plugin-name>/
  package.json
  tsconfig.json
  vite.config.ts          # dual-format lib build + dts
  vitest.config.ts        # see the vitest-package-setup skill
  README.md
  CHANGELOG.md            # created by changesets; do not hand-write
  src/
    main.ts               # factory + pure exports (orchestration only)
    Constants.ts          # scan globs, signal names/keys, virtual IDs
    Types.ts              # named contracts (options, scan model, output schema)
    scan/                 # locating + extracting signals (one module per signal)
    generate/             # serializers / codegen (one module per output format)
  test/
    fixtures/             # sample .component.ts / .page.ts / .ts inputs
    <name>.test.ts
```

Group files by the job they do: put the code for scanning one signal together,
each output serializer in its own module, and reusable stateless policy in a
class of static methods named for the job it performs (e.g.
`ComponentSourceUtils`, `CustomElementsManifestUtils`) — never a generic `Utils`
bucket. The reference plugins use `domain/` and `utils/` folder names for this;
the folder name matters less than keeping one job per module. Keep `main.ts`
limited to orchestration. See `code-quality` for the grouping rules.

## package.json

Start from `packages/plugins/web-type-json/package.json`. Invariant fields:

```json
{
  "name": "@ayu-sh-kr/<plugin-name>",
  "private": false,
  "publishConfig": { "access": "public" },
  "version": "0.0.1",
  "type": "module",
  "sideEffects": false,
  "types": "./dist/index.d.ts",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "module": "./dist/index.mjs",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc && vite build",
    "release": "pnpm run build && changeset publish",
    "test": "tsc --noEmit && vitest run"
  },
  "peerDependencies": { "vite": "^7.1.0" },
  "files": ["dist/", "README.md", "package.json"]
}
```

Published-plugin standards to add on top of the workspace baseline:

- **Discoverability metadata.** Set `description`, `keywords` (include
  `vite-plugin`), `author`, `license`, and `repository`/`homepage`/`bugs` so the
  package is findable and links back to source.
- **`sideEffects: false`** — these plugins are pure module graphs; this enables
  downstream tree-shaking.
- **Peer range, not pin.** Keep `vite` a `peerDependencies` range so the plugin
  adopts the host app's Vite. Add `peerDependenciesMeta` with `optional: true`
  only for genuinely optional integrations.

Runtime dependencies shared by every scanning plugin:

- `@ayu-sh-kr/dota-ast-utils` (`workspace:*`) — AST traversal.
- `@swc/core` — parser.
- `fast-glob` — file discovery.
- `consola` — logging.
- `@ayu-sh-kr/dota-core` (`workspace:*`) — decorator/runtime types when needed.

Add `@ayu-sh-kr/dota-router` only if the plugin emits routing (preloader does).
Do not add `vitest`/`@vitest/coverage-v8`/`happy-dom` at the package level — they
are workspace-root dev dependencies.

## tsconfig.json

Copy `packages/plugins/dota-vite-preloader/tsconfig.json`; it is the plugin
baseline. Load-bearing parts:

- `"experimentalDecorators": true`, `"emitDecoratorMetadata": true` — fixtures
  and scanned source use decorators.
- `"moduleResolution": "Bundler"`, `"allowImportingTsExtensions": true`,
  `"noEmit": true` — source imports use explicit `.ts` extensions
  (`@dota/Constants.ts`).
- `"declaration": true`, `"declarationDir": "./dist/types"`, `"outDir": "./dist"`.
- `"paths": { "@dota/*": ["./src/*"] }` — the source alias.
- `"include": ["src", "test"]`.

## vite.config.ts

Copy `packages/plugins/web-type-json/vite.config.ts` — a dual-format library
build with rolled-up types:

```ts
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ["cjs", "es"],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    minify: false,
    rollupOptions: {
      external: [/^node:.*/, "fs", "path", "url", "fast-glob", "@swc/core", "vite"],
    }
  },
  resolve: { alias: { '@dota': resolve('./src') } },
  plugins: [dts({ insertTypesEntry: true, rollupTypes: true })]
});
```

Standard rule: **externalize everything that is a peer, runtime, or Node
builtin** — a plugin must never bundle `vite`, `@swc/core`, `fast-glob`, or
`node:*`. Keep `minify: false` so published output stays debuggable.

## Constants.ts

Define scan globs and every AST literal up front, so the scanner never inlines a
magic string:

```ts
export class ComponentScanPath {
  static SOURCE_PAGE_DIRECTORY_SCAN_PATH = "./src/pages/**/*.page.ts";
  static SOURCE_COMPONENT_DIRECTORY_SCAN_PATH = "./src/components/**/*.component.ts";
  static SOURCE_ROOT_DIRECTORY_SCAN_PATH = "./src/**/*.component.ts";
}

export class ASTFilterConstants {
  // the decorator/argument/callee names this plugin scans for, e.g.
  static COMPONENT_DECORATOR_NAME = 'Component';
  static COMPONENT_TAG_NAME_PROPERTY = 'selector';
}
```

A plugin that emits virtual modules also needs a `VirtualImportID` class with the
public id and the `\0`-prefixed resolved id (see `plugin-build-watcher`).

## main.ts factory skeleton

Resolve `root` from Vite rather than assuming the process cwd:

```ts
import type { Plugin, ResolvedConfig } from "vite";
import { createConsola, LogLevels, type LogType } from "consola";

export type <Plugin>Options = {
  root?: string;          // explicit override; defaults to Vite's resolved root
  logType?: LogType;
  // plugin-specific options
};

let log = createConsola();

export default function <plugin>(options: <Plugin>Options = {}): Plugin {
  const { logType = 'info' } = options;
  let root = options.root ?? process.cwd();   // provisional until configResolved
  log = createConsola({ level: LogLevels[logType], formatOptions: { date: true, colors: true } });

  return {
    name: 'vite-plugin-<plugin-name>',
    // apply / enforce only when ordering or a single command matters
    configResolved(config: ResolvedConfig) {
      if (!options.root) root = config.root;   // honor Vite's resolved root
    },
    async buildStart() { /* eager scan + generate */ },
    configureServer(server) { /* dev refresh */ },
  };
}
```

Keep the factory thin: it wires options, logging, and hooks, and delegates
scanning to `plugin-source-scanning` functions and output to
`plugin-artifact-generation` functions.

## Finish the scaffold

1. Add Vitest with the `vitest-package-setup` skill (aliases `@dota` → `src`,
   `@test` → `test`; mirror them in `tsconfig.json`).
2. Write a `README.md` following the reference plugins' structure: what it
   generates, how discovery works, options, and which Vite hooks it implements.
3. Verify the package builds and type-checks in isolation:

```bash
pnpm --filter @ayu-sh-kr/<plugin-name> build
pnpm --filter @ayu-sh-kr/<plugin-name> test
```

4. Create a changeset with `create-changeset` before release. `CHANGELOG.md` and
   `version` are managed by changesets — do not edit them by hand.

## Review checklist

- Is the plugin object `name` `vite-plugin-<slug>` and the package `@ayu-sh-kr/*`?
- Does `package.json` carry discoverability metadata, `sideEffects: false`, a
  peer `vite` range, and the dual `exports` map?
- Are all peers/runtime/Node builtins externalized in `vite.config.ts`?
- Does the factory resolve `root` from `configResolved` with an option override?
- Is `main.ts` orchestration-only, with scanning and generation in job-grouped
  modules and all literals in `Constants.ts`?
