# Vite 8 plugin, library, and utility migration audit

This audit covers the three published Vite plugins and the five published libraries and two utilities in the workspace.

- [`@ayu-sh-kr/dota-preloader-plugin`](../../../packages/plugins/dota-vite-preloader/)
- [`@ayu-sh-kr/dota-event-map-generator`](../../../packages/plugins/event-map-generator/)
- [`@ayu-sh-kr/dota-web-type-json`](../../../packages/plugins/web-type-json/)

Libraries:

- [`@ayu-sh-kr/dota-core`](../../../packages/libs/dota-core/)
- [`@ayu-sh-kr/dota-event`](../../../packages/libs/dota-event/)
- [`@ayu-sh-kr/dota-rest`](../../../packages/libs/dota-rest/)
- [`@ayu-sh-kr/dota-router`](../../../packages/libs/dota-router/)
- [`@ayu-sh-kr/dota-wrap`](../../../packages/libs/dota-wrap/)

Utilities:

- [`@ayu-sh-kr/dota-ast-utils`](../../../packages/utils/dota-ast-utils/)
- [`@ayu-sh-kr/dota-common-utils`](../../../packages/utils/dota-common-utils/)

The audit was performed against the repository state on 2026-08-02. It is an investigation and migration plan; it does not change the plugins or upgrade the workspace toolchain.

## Executive summary

The plugins are already Vite plugins rather than Rollup-only plugins. All three use the standard Vite `Plugin` contract, `buildStart`, and `configureServer`; the preloader additionally uses Vite virtual modules, the module graph, the development watcher, and the WebSocket channel. None uses a known Vite 8-removed hook such as `moduleParsed`, `resolveFileUrl`, `renderDynamicImport`, or `resolveImportMeta`.

The migration is therefore configuration- and validation-heavy, not a plugin rewrite:

| Area | Current state | Vite 8 work | Risk |
| --- | --- | --- | --- |
| Root toolchain | Vite `7.3.1`, Vitest `4.0.6`, `vite-plugin-dts` `4.5.4` | Upgrade and lock one Vite 8-compatible toolchain | Medium |
| Published peer contracts | All three plugins declare `vite: ^7.1.0` | Change to Vite 8-only or dual Vite 7/8 support | Required |
| Library build configs | All three use `build.rollupOptions` | Rename to `build.rolldownOptions` in the Vite 8 branch | Required for a clean migration |
| Plugin hooks | Standard Vite hooks and server APIs | Keep the hooks; run Vite 8 dev/build regression tests | Low to medium |
| Declaration generation | `vite-plugin-dts` with `rollupTypes: true` | Validate the chosen `vite-plugin-dts`/TypeScript/API Extractor combination | Medium |
| Test coverage | Hook tests are mostly manually invoked; no full Vite 8 host-project fixture | Add one host-project smoke fixture per plugin or one shared fixture | Medium |

The library and utility audit has a similar shape, but with two additional concerns: `dota-wrap` owns a custom multi-entry Vite build API, and `dota-core`/`dota-event` depend on the runtime behavior of decorated web components and event classes. The seven packages currently pass 839 tests and all seven Vite 7 builds pass. The recommended Vite 8 migration remains low-to-medium overall, with `dota-wrap` and `dota-core` requiring the deepest regression coverage.

Vite 8 uses Rolldown and Oxc in place of the previous Rollup/esbuild production and transform pipeline, but Vite provides a compatibility layer for many existing configurations. The official migration guide specifically marks `build.rollupOptions` as deprecated and renames it to `build.rolldownOptions`, so leaving the old spelling is a temporary compatibility choice rather than the finished migration. See the [Vite 7-to-8 migration guide](https://vite.dev/guide/migration.html) and the [Vite 8 announcement](https://vite.dev/blog/announcing-vite8).

## Current baseline

### Toolchain and package contracts

The root [`package.json`](../../../package.json) currently pins Vite `7.3.1`, while the three plugin manifests use Vite as a peer dependency at `^7.1.0`. Their build configurations import `vite-plugin-dts` from the workspace root and emit the same public artifacts:

- `dist/index.js` for CommonJS consumers;
- `dist/index.mjs` for ESM consumers;
- `dist/index.d.ts` for declarations.

The root declaration builds currently report that API Extractor analyzes TypeScript 5.9.3 output with a bundled TypeScript 5.8.2 engine. This warning is not a Vite 8 failure, but it makes the Vite 8 toolchain upgrade a good time to choose and pin a declaration-tooling combination that supports the workspace TypeScript version.

### Vite 7 validation results

The existing package checks pass on Vite 7.3.1:

| Plugin | Test result | Build result | Existing output notes |
| --- | ---: | --- | --- |
| Preloader | 1 file, 4 tests | Pass; 10 modules transformed | API Extractor TypeScript-version warning |
| Event map generator | 6 files, 42 tests | Pass; 6 modules transformed | API Extractor warning and mixed default/named export warning |
| Web Type JSON | 4 files, 83 tests | Pass; 8 modules transformed | API Extractor warning and mixed default/named export warning |

The build commands are currently `tsc && vite build` for all three plugins. Their TypeScript configs already set `noEmit: true`, so the command works, but `tsc --noEmit && vite build` is clearer and prevents future config changes from producing transient files before Vite empties `dist`.

## What Vite 8 changes for these plugins

### Rolldown replaces Rollup for production builds

Vite 8 keeps the Vite/Rollup-style plugin API, but the production bundler is Rolldown. Existing `rollupOptions` are automatically compatibility-translated, while the migration guide marks `build.rollupOptions` as deprecated in favor of `build.rolldownOptions`.

This repository has exactly three plugin-local `rollupOptions` blocks, one in each plugin build config. They only configure `external`; they do not use output hooks or unsupported Rollup options. Renaming the property is consequently mechanical.

### Oxc replaces esbuild for JavaScript transforms

None of the three plugins calls `transformWithEsbuild`, configures `esbuildOptions`, or depends on an esbuild transform plugin. Their source scanning uses SWC directly through `@swc/core`, so there is no source-transform migration required for this Vite change.

### Plugin hook compatibility remains high

The Vite plugin API remains the correct API for all three packages. The official [plugin API documentation](https://vite.dev/guide/api-plugin.html) says that Vite plugins can use Vite-specific hooks and that compatible Rollup/Rolldown hooks generally continue to work when they do not depend on unsupported bundle internals.

The following existing hooks are expected to remain valid:

| Hook/API | Plugins | Vite 8 assessment |
| --- | --- | --- |
| `resolveId` / `load` | Preloader | Standard virtual-module flow; test generated module IDs under Vite 8 |
| `buildStart` | All three | Standard build hook; production-safe because it does not require a dev server |
| `configResolved` | Event map generator | Standard hook; verify `config.resolve.alias` shape in the Vite 8 type/runtime pair |
| `configureServer` | All three | Vite-specific and serve-only; keep it guarded from production assumptions |
| `server.watcher` | All three | Existing dev watcher behavior should remain, but test external roots and normalized paths |
| `server.moduleGraph` | Preloader | Vite-specific invalidation flow; highest runtime compatibility risk |
| `server.ws.send` | Preloader and event map generator | Existing `full-reload` behavior is supported; no custom event migration is needed |

`configureServer` is not called during production builds. Each plugin already performs its production work in `buildStart`, which is the correct separation. The official plugin API calls out this distinction explicitly.

### CommonJS interop needs an explicit smoke test

Vite 8 makes CommonJS default-import behavior more consistent. The plugins externalize CJS packages such as `fast-glob` and, depending on the package, `consola` and `@swc/core`. The source contains default imports such as `import fg from 'fast-glob'` and named imports from the external packages.

This is not evidence of a required code change, but it is a required compatibility check. Every published plugin should be exercised through both its ESM and CommonJS entry points after the upgrade, especially the two generators that expose a default plugin plus named utilities.

## Plugin-by-plugin audit

### 1. Dota Vite preloader

Source: [`src/main.ts`](../../../packages/plugins/dota-vite-preloader/src/main.ts) and [`vite.config.ts`](../../../packages/plugins/dota-vite-preloader/vite.config.ts).

#### Responsibilities and Vite coupling

The preloader scans Dota components and routes, then exposes two virtual modules. Its plugin implementation:

1. maps public virtual IDs to resolved internal IDs in `resolveId`;
2. generates component and route module source in `load`;
3. performs a complete scan in `buildStart`;
4. listens to `add`, `unlink`, and `change` events in `configureServer`;
5. invalidates the Vite module graph and sends a full reload when registration metadata changes.

This is intentionally a Vite-only plugin. The module graph, dev server watcher, and WebSocket APIs are Vite-specific. It should not be renamed to a generic `rolldown-plugin-*` package during this migration.

#### Required changes

| Change | Size | Reason |
| --- | --- | --- |
| Update `peerDependencies.vite` | Small | `^7.1.0` does not advertise Vite 8 support |
| Rename `build.rollupOptions` to `build.rolldownOptions` | Small | Removes Vite 8 deprecation usage |
| Update root Vite/Vitest/declaration tooling | Shared | The plugin consumes the workspace toolchain |
| Add a Vite 8 host-project test | Medium | Existing tests cover route scanning, not virtual-module resolution or the live module graph |
| Add watcher path regression cases | Medium | Vite normalizes resolved paths; the plugin compares relative file paths and filters by project root |

#### Vite 8 risk assessment

Risk is medium because the core hook API is compatible, but `server.moduleGraph.invalidateModule` and `server.ws.send({type: 'full-reload'})` are observable dev-server integrations. A build-only test cannot prove these behaviors.

The preloader does not use any of the Vite 8-removed bundle hooks. Its SWC parsing is independent of Vite's Oxc transform, so decorator parsing in this plugin should not change merely because Vite changes its own transform engine.

#### Before and after: build configuration

Before:

```ts
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['cjs', 'es'],
      fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
    },
    rollupOptions: {
      external: [
        /^node:.*/,
        'fs',
        'path',
        'url',
        'fast-glob',
        '@swc/core',
        'vite',
      ],
    },
  },
});
```

After the Vite 8 migration:

```ts
export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.ts'),
      formats: ['cjs', 'es'],
      fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
    },
    rolldownOptions: {
      external: [
        /^node:.*/,
        'fs',
        'path',
        'url',
        'fast-glob',
        '@swc/core',
        'vite',
      ],
    },
  },
});
```

The `external` list is not otherwise expected to change. The `import.meta.dirname` change is a robustness cleanup for the ESM config, not a Vite 8 requirement.

#### Before and after: host-project validation

Before, the current package-only test validates only the scanner domain:

```bash
pnpm --filter @ayu-sh-kr/dota-preloader-plugin test
pnpm --filter @ayu-sh-kr/dota-preloader-plugin build
```

After, add a small Vite fixture that imports both virtual modules:

```ts
// fixture/vite.config.ts
import {defineConfig} from 'vite';
import preloader from '@ayu-sh-kr/dota-preloader-plugin';

export default defineConfig({
  plugins: [preloader({root: import.meta.dirname})],
});
```

The fixture should assert that a Vite 8 build resolves both virtual IDs and that a dev-server change to a component file invalidates the virtual module. A separate test should change only a method body and confirm that the plugin leaves normal HMR to Vite, as the current implementation intends.

### 2. Application event-map generator

Source: [`src/main.ts`](../../../packages/plugins/event-map-generator/src/main.ts) and [`vite.config.ts`](../../../packages/plugins/event-map-generator/vite.config.ts).

#### Responsibilities and Vite coupling

The event-map generator scans application sources in `buildStart`, writes a declaration file and optional source-location JSON, and watches configured roots in `configureServer`. It also consumes Vite's resolved aliases in `configResolved` so the AST resolver can understand application import paths.

Its watcher implementation is already careful about Vite-specific behavior:

- external scan roots are explicitly added to the watcher;
- `.d.ts` output is excluded to prevent a generated-file feedback loop;
- unsupported extensions and files outside configured scan roots are ignored;
- concurrent changes share one pending regeneration promise;
- a full reload is sent only after a supported source change is regenerated.

#### Required changes

| Change | Size | Reason |
| --- | --- | --- |
| Update `peerDependencies.vite` | Small | Advertise Vite 8 support |
| Rename `build.rollupOptions` to `build.rolldownOptions` | Small | Remove deprecated Vite 8 config spelling |
| Verify `configResolved` alias normalization | Small | Vite 8 still exposes aliases, but this is a direct dependency on resolved config shape |
| Add a real Vite 8 watcher fixture | Medium | Current tests invoke hooks with mocks; they do not run a Vite dev server |
| Decide whether to fix mixed export warning | Small, separate | Build currently warns because the entry has a default plugin and named utility exports |

Risk is low to medium. The generator does not use virtual modules or bundle-phase output hooks. The largest compatibility surface is the interaction between Vite's resolved aliases, watcher path normalization, and scan roots outside the project root.

#### Before and after: build configuration

Before:

```ts
build: {
  lib: {
    entry: resolve(__dirname, 'src/main.ts'),
    formats: ['cjs', 'es'],
    fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
  },
  rollupOptions: {
    external: [
      /^node:.*/, 'fs', 'path', 'url', 'fast-glob',
      '@swc/core', 'consola', 'vite',
      '@ayu-sh-kr/dota-ast-utils',
    ],
  },
},
```

After:

```ts
build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/main.ts'),
    formats: ['cjs', 'es'],
    fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
  },
  rolldownOptions: {
    external: [
      /^node:.*/, 'fs', 'path', 'url', 'fast-glob',
      '@swc/core', 'consola', 'vite',
      '@ayu-sh-kr/dota-ast-utils',
    ],
  },
},
```

#### Existing warning to resolve deliberately

Vite 7 currently warns that `src/main.ts` contains both a default export and named exports. This is not a Vite 8 break, but a migration should avoid carrying the warning forward. There are two valid choices:

1. keep the public API and set `rolldownOptions.output.exports: 'named'`, then verify both `import plugin from ...` and named utility imports;
2. split the default plugin entry and named utilities into explicit entry points, which is a larger package API change.

The first option is the smaller migration, but it must be checked against the package's existing CommonJS export shape before release.

### 3. Web Type JSON generator

Source: [`src/main.ts`](../../../packages/plugins/web-type-json/src/main.ts) and [`vite.config.ts`](../../../packages/plugins/web-type-json/vite.config.ts).

#### Responsibilities and Vite coupling

The Web Type JSON generator scans component source, writes `web-types.json`, optionally writes a Custom Elements Manifest, and updates package metadata. It runs generation in `buildStart` and coalesces source changes in `configureServer`.

The plugin does not use a virtual module or bundle output hook. Its Vite-specific behavior is limited to the build lifecycle and the development watcher, which makes its production migration the lowest-risk of the three.

#### Required changes

| Change | Size | Reason |
| --- | --- | --- |
| Update `peerDependencies.vite` | Small | Advertise Vite 8 support |
| Rename `build.rollupOptions` to `build.rolldownOptions` | Small | Remove deprecated Vite 8 config spelling |
| Verify external CJS imports | Small | `fast-glob` is externalized and imported as a default |
| Add a real Vite 8 watcher fixture | Medium | Current tests manually invoke hooks and watcher callbacks |
| Decide whether to fix mixed export warning | Small, separate | The entry exports a default plugin and named utilities |

Risk is low to medium. The artifact writer's filesystem behavior is independent of Rolldown, but the plugin should be tested in a real project because it modifies `web-types.json` and package metadata while Vite is serving.

#### Before and after: build configuration

Before:

```ts
build: {
  lib: {
    entry: resolve(__dirname, 'src/main.ts'),
    formats: ['cjs', 'es'],
    fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
  },
  rollupOptions: {
    external: [
      /^node:.*/, 'fs', 'path', 'url', 'fast-glob',
      '@swc/core', 'vite',
    ],
  },
},
```

After:

```ts
build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/main.ts'),
    formats: ['cjs', 'es'],
    fileName: format => format === 'es' ? 'index.mjs' : 'index.js',
  },
  rolldownOptions: {
    external: [
      /^node:.*/, 'fs', 'path', 'url', 'fast-glob',
      '@swc/core', 'vite',
    ],
  },
},
```

#### Existing watcher contract to preserve

The current watcher intentionally regenerates artifacts but does not explicitly send a full reload. That behavior should be decided before adding a Vite 8 fixture:

- if consumers need the generated JSON immediately in the browser, send a namespaced custom event or a full reload after regeneration;
- if the generated file is consumed only by the IDE/build pipeline, retain the current behavior and document it.

This is an existing product decision, not a Vite 8 requirement.

## Library and utility audit

### Inventory and Vite 7 baseline

All five libraries and both utilities already use Vite library mode and Vitest. None contains Jest or tsup configuration, and none uses Vite plugin hooks such as `configureServer`, virtual modules, or the module graph. The exception to the ordinary package shape is `dota-wrap`: its production build bypasses the package `vite.config.ts` and runs a custom multi-entry builder through Vite's JavaScript API.

| Package | Build model | Vite-sensitive surface | Vite 7 baseline | Migration risk |
| --- | --- | --- | ---: | --- |
| `@ayu-sh-kr/dota-core` | Vite library mode + `vite-plugin-dts` | `rollupOptions`, `__dirname`, legacy decorators, external runtime packages | 20 files, 365 tests | Medium to high |
| `@ayu-sh-kr/dota-event` | Vite library mode + `vite-plugin-dts` | `rollupOptions`, `path`/`__dirname`, decorator-based event API | 7 files, 181 tests | Low to medium |
| `@ayu-sh-kr/dota-rest` | Vite library mode + `vite-plugin-dts` | `__dirname`; no custom Rollup options | 4 files, 26 tests | Low |
| `@ayu-sh-kr/dota-router` | Vite library mode + `vite-plugin-dts` | `rollupOptions`, dependency on decorated core, browser Navigation API | 17 files, 116 tests | Medium |
| `@ayu-sh-kr/dota-wrap` | Custom eight-entry Vite API build + manual declaration assembly | `rollupOptions`, multi-entry output, internal/external package policy, bundled plugin subpaths | 2 files, 2 tests | Medium to high |
| `@ayu-sh-kr/dota-ast-utils` | Vite library mode + `vite-plugin-dts` | `rollupOptions`, `__dirname`, external SWC/fast-glob CJS interop | 23 files, 148 tests | Medium |
| `@ayu-sh-kr/dota-common-utils` | Vite library mode + `vite-plugin-dts` | `rollupOptions`, `__dirname`, empty entry output | 1 file, 1 test | Low |

The baseline commands were run with the existing root toolchain (`vite` 7.3.1 and `vitest` 4.0.6):

```bash
pnpm --filter @ayu-sh-kr/dota-core test && pnpm --filter @ayu-sh-kr/dota-core build
pnpm --filter @ayu-sh-kr/dota-event test && pnpm --filter @ayu-sh-kr/dota-event build
pnpm --filter @ayu-sh-kr/dota-rest test && pnpm --filter @ayu-sh-kr/dota-rest build
pnpm --filter @ayu-sh-kr/dota-router test && pnpm --filter @ayu-sh-kr/dota-router build
pnpm --filter @ayu-sh-kr/dota-wrap test && pnpm --filter @ayu-sh-kr/dota-wrap build
pnpm --filter @ayu-sh-kr/dota-ast-utils test && pnpm --filter @ayu-sh-kr/dota-ast-utils build
pnpm --filter @ayu-sh-kr/dota-common-utils test && pnpm --filter @ayu-sh-kr/dota-common-utils build
```

Every command passed. The conventional library builds continue to report the existing API Extractor TypeScript 5.8.2 versus workspace TypeScript 5.9.3 warning. `dota-wrap` additionally reports existing mixed default/named export warnings for its bundled `event-map-generator` and `web-type-json` subpaths, plus declaration files emitted outside the active entry directory. These are packaging checks to preserve or resolve during the Vite 8 migration; they are not currently Vite 7 failures.

### Shared findings for libraries and utilities

#### The migration is not a Jest or tsup replacement

The seven packages already use Vitest and Vite. There are no package-local Jest or tsup references under `packages/libs` or `packages/utils`. The migration work is therefore not a test-framework rewrite. Keep the existing Vitest assertions and happy-dom environment, then run them against the upgraded Vite/Vitest pair.

The build scripts are slightly inconsistent:

- `dota-core`, `dota-rest`, and `dota-router` already use `tsc --noEmit && vite build`;
- `dota-event`, `dota-ast-utils`, and `dota-common-utils` use `tsc && vite build` even though their `tsconfig.json` sets `noEmit: true`;
- `dota-wrap` uses `tsc --noEmit && node scripts/build.mjs`.

Aligning the first group to `tsc --noEmit && vite build` is a cleanup, not a Vite 8 requirement. It makes the intended typecheck-only step explicit and keeps all packages consistent.

#### `rollupOptions` is present in six library/utility build paths

The following files still use the Vite 7-compatible spelling:

- `packages/libs/dota-core/vite.config.ts`;
- `packages/libs/dota-event/vite.config.ts`;
- `packages/libs/dota-router/vite.config.ts`;
- `packages/libs/dota-wrap/scripts/build.mjs`;
- `packages/utils/dota-ast-utils/vite.config.ts`;
- `packages/utils/dota-common-utils/vite.config.ts`.

`dota-rest` does not define `rollupOptions` because it has no declared runtime dependencies requiring externalization. For Vite 8, rename the six existing `build.rollupOptions` properties to `build.rolldownOptions`. Preserve the external lists and output filenames until package smoke tests prove that the generated ESM and CommonJS contracts are unchanged.

#### ESM config paths should be made consistent

Most Vite and Vitest configs import `path` and resolve from `__dirname`. The router configs already use `node:path` and `import.meta.dirname`, which is the preferred pattern for this ESM workspace. Apply the same pattern to the remaining package configs:

```ts
// Before: used by most library and utility configs
import {resolve} from 'path';

entry: resolve(__dirname, 'src/main.ts');

// After: preferred ESM form
import {resolve} from 'node:path';

entry: resolve(import.meta.dirname, 'src/main.ts');
```

This path change is a configuration robustness cleanup rather than a documented Vite 8 breaking change. It should be made in both `vite.config.ts` and `vitest.config.ts` where applicable, then checked on Node versions supported by Vite 8.

#### Package Vite dependency policy needs to stay intentional

`dota-wrap` is currently the only library that declares Vite in both `devDependencies` and `peerDependencies`. The other libraries and utilities use the workspace-root Vite installation only for building and do not expose Vite as a runtime API. Do not add Vite as a runtime dependency to those packages merely because their build uses Vite.

For the Vite 8 change, update `dota-wrap`'s peer range because its published plugin subpaths are consumed by Vite projects. For the other libraries and utilities, a root/toolchain upgrade is sufficient unless the project deliberately wants each package to be independently buildable outside this workspace.

#### Declaration generation is the main shared toolchain risk

All seven packages use `vite-plugin-dts`. The ordinary packages use `rollupTypes: true`; `dota-wrap` uses `bundledPackages` and then manually copies declarations from dependent packages into its subpath directories. Validate the `vite-plugin-dts` and API Extractor versions together with Vite 8 rather than treating declaration generation as a secondary build detail.

Every published entry must be checked after the upgrade:

```ts
// ESM consumer
const esm = await import('@ayu-sh-kr/dota-ast-utils');

// CommonJS consumer
const cjs = require('@ayu-sh-kr/dota-ast-utils');
```

Use the equivalent package and subpath for each library. For `dota-wrap`, test every export in `package.json`, not only the root entry.

### 1. `@ayu-sh-kr/dota-core`

Sources: [`vite.config.ts`](../../../packages/libs/dota-core/vite.config.ts), [`vitest.config.ts`](../../../packages/libs/dota-core/vitest.config.ts), and [`tsconfig.json`](../../../packages/libs/dota-core/tsconfig.json).

`dota-core` is the core decorated web-component runtime. It has the highest source-level sensitivity because its build output must preserve decorator behavior, custom-element registration, metadata, and browser DOM interactions. Its Vite config is otherwise a conventional library build with `reflect-metadata` and `@ayu-sh-kr/dota-event` externalized.

Required work:

| Change | Size | Reason |
| --- | --- | --- |
| Rename `rollupOptions` to `rolldownOptions` | Small | Vite 8's non-deprecated library configuration |
| Normalize `node:path` and `import.meta.dirname` | Small | Consistent ESM config and Vitest alias resolution |
| Regression-test decorators and metadata | Medium to high | `experimentalDecorators` and `emitDecoratorMetadata` are enabled, while the build emits through Vite rather than `tsc` |
| Test external runtime identity | Medium | `reflect-metadata` and `dota-event` remain external package references |
| Add packed ESM/CJS smoke tests | Medium | The public runtime contains DOM classes and decorators, not only plain functions |

The Vite 8 Oxc transition does not automatically imply a decorator rewrite, but the build must prove that classes decorated with `@Component`, `@Property`, `@State`, and lifecycle decorators behave the same after bundling. The existing happy-dom suite is a good unit baseline; add one build-consumer fixture that imports the built artifact and registers a custom element.

Before:

```ts
import {resolve} from 'node:path';

build: {
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    formats: ['cjs', 'es'],
  },
  rollupOptions: {
    external: dependencies ? Object.keys(dependencies) : [],
  },
}
```

After:

```ts
import {resolve} from 'node:path';

build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/index.ts'),
    formats: ['cjs', 'es'],
  },
  rolldownOptions: {
    external: dependencies ? Object.keys(dependencies) : [],
  },
}
```

The related [TypeScript 6 and Vite 8 decorator migration plan](./typescript-6-vite-8-decorator-migration-plan.md) should remain the source of truth for any decorator syntax or metadata policy changes.

### 2. `@ayu-sh-kr/dota-event`

Sources: [`vite.config.ts`](../../../packages/libs/dota-event/vite.config.ts), [`vitest.config.ts`](../../../packages/libs/dota-event/vitest.config.ts), and [`tsconfig.json`](../../../packages/libs/dota-event/tsconfig.json).

`dota-event` provides event buses, listeners, publishers, bind managers, and event decorators. It is a conventional Vite library, and `reflect-metadata` is the only declared runtime dependency. Its seven test files and 181 passing tests already cover the public event behavior well, but they do not prove the built package's decorator and external dependency behavior.

Required work:

- rename `build.rollupOptions` to `build.rolldownOptions`;
- replace `path`/`__dirname` in both Vite and Vitest configs with `node:path`/`import.meta.dirname`;
- keep `reflect-metadata` external and verify that only one runtime metadata instance is used by a consumer;
- add a packed-package test for an event decorator imported from both ESM and CommonJS entry points;
- align `tsc && vite build` with the workspace's `tsc --noEmit && vite build` convention.

Risk is low to medium. The source does not use Vite APIs or esbuild configuration, so the main uncertainty is whether Oxc-transformed decorated classes and the external metadata package preserve the current event registration behavior.

### 3. `@ayu-sh-kr/dota-rest`

Sources: [`vite.config.ts`](../../../packages/libs/dota-rest/vite.config.ts), [`vitest.config.ts`](../../../packages/libs/dota-rest/vitest.config.ts), and [`tsconfig.json`](../../../packages/libs/dota-rest/tsconfig.json).

`dota-rest` is the lowest-risk library. It is a fetch-based client with no declared runtime dependencies and no `rollupOptions` block. Its build only needs the shared Vite/Vitest/declaration toolchain upgrade and ESM config cleanup.

Required work:

- replace `__dirname` with `import.meta.dirname` in `vite.config.ts` and `vitest.config.ts`;
- keep the current `tsc --noEmit && vite build` script;
- verify that fetch/request error behavior is unchanged through the built ESM and CommonJS entry points;
- run a package pack/install smoke test because the package manifest currently declares `main`/`module` but relies on the generated files for the final consumer contract.

There is no Vite plugin hook, decorator transform, external dependency list, or Vite-specific runtime API to migrate.

### 4. `@ayu-sh-kr/dota-router`

Sources: [`vite.config.ts`](../../../packages/libs/dota-router/vite.config.ts), [`vitest.config.ts`](../../../packages/libs/dota-router/vitest.config.ts), and [`package.json`](../../../packages/libs/dota-router/package.json).

`dota-router` is a browser-runtime library built with standard Vite library mode. Its Vite config and Vitest config already use `node:path` and `import.meta.dirname`, so it is partly ahead of the other packages. The build config still uses `rollupOptions` and externalizes `@ayu-sh-kr/dota-core` and `reflect-metadata`.

Required work:

| Change | Size | Reason |
| --- | --- | --- |
| Rename `rollupOptions` to `rolldownOptions` | Small | Vite 8 config migration |
| Preserve `dota-core` as an external package | Medium | Avoid duplicate decorated runtime and metadata state |
| Run browser-consumer build tests | Medium | The router uses `window`, `document`, `HTMLElement`, History API, and Navigation API types |
| Verify `dom-navigation`/happy-dom behavior | Medium | The current test environment mocks or exercises browser navigation APIs |

The source does not use Vite hooks or esbuild options. Its risk is integration-oriented: a Vite 8-built router must still consume a Vite 8-built core package without creating a second runtime copy or changing decorator-created route metadata. The existing 116 tests are a strong behavior baseline, but a packed consumer fixture should exercise `DotaRouterService`, `DomHistoryRouter`, and a decorated component together.

Before:

```ts
build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/main.ts'),
  },
  rollupOptions: {
    external: dependencies ? Object.keys(dependencies) : [],
  },
}
```

After:

```ts
build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/main.ts'),
  },
  rolldownOptions: {
    external: dependencies ? Object.keys(dependencies) : [],
  },
}
```

### 5. `@ayu-sh-kr/dota-wrap`

Sources: [`vite.config.ts`](../../../packages/libs/dota-wrap/vite.config.ts), [`scripts/build.mjs`](../../../packages/libs/dota-wrap/scripts/build.mjs), and [`package.json`](../../../packages/libs/dota-wrap/package.json).

`dota-wrap` is the largest library migration surface even though its unit-test count is small. It publishes a root entry plus seven subpaths, builds each entry through `build()` from Vite's JavaScript API, bundles the three build-time plugin subpaths, keeps browser runtime packages external, and manually assembles dependent declaration files.

The package-level `vite.config.ts` is used by `dev`, but the production `build` script passes `configFile: false` and creates each build configuration in `scripts/build.mjs`. Updating only `vite.config.ts` would therefore leave the real production path on `rollupOptions`.

Required work:

| Change | Size | Reason |
| --- | --- | --- |
| Rename `rollupOptions` in `scripts/build.mjs` | Small | This is the actual production build configuration |
| Update `vite.config.ts` as well | Small | Keep the development configuration consistent |
| Validate all eight entry outputs | High | Vite is invoked repeatedly with separate `outDir` and declaration settings |
| Recheck `getExternal()` policy | High | Runtime packages stay external while plugin packages are bundled |
| Recheck manual declaration copying | High | `vite-plugin-dts` currently emits outside entry directories and the script rewrites package-local import paths |
| Resolve or document mixed export warnings | Medium | Bundled plugin subpaths contain default and named exports |
| Update the Vite peer range | Small | This package publishes Vite plugin subpaths consumed by host projects |

Before:

```js
await build({
  configFile: false,
  build: {
    lib: {
      entry: resolve(packageRoot, entry.source),
      formats: ['cjs', 'es'],
      fileName: format => format === 'es' ? 'index.mjs' : 'index.cjs',
    },
    rollupOptions: {
      external: getExternal(entry),
    },
  },
});
```

After:

```js
await build({
  configFile: false,
  build: {
    lib: {
      entry: resolve(packageRoot, entry.source),
      formats: ['cjs', 'es'],
      fileName: format => format === 'es' ? 'index.mjs' : 'index.cjs',
    },
    rolldownOptions: {
      external: getExternal(entry),
    },
  },
});
```

The most important `dota-wrap` acceptance test is not merely “all eight builds finish.” Pack the result and verify that each export in `package.json` resolves to the expected ESM, CommonJS, and declaration file. Then run a browser fixture that imports `@ayu-sh-kr/dota-wrap`, registers components, and initializes a router. Run a separate Node fixture that imports the plugin subpaths and confirms that their bundled scanner dependencies are present while Node-only dependencies remain external as intended.

### 6. `@ayu-sh-kr/dota-ast-utils`

Sources: [`vite.config.ts`](../../../packages/utils/dota-ast-utils/vite.config.ts), [`vitest.config.ts`](../../../packages/utils/dota-ast-utils/vitest.config.ts), and [`package.json`](../../../packages/utils/dota-ast-utils/package.json).

`dota-ast-utils` is a Vite-built AST library that uses `@swc/core` for parsing and `fast-glob` for source discovery. Both are externalized by the build config. Vite 8's Oxc transform does not replace the explicit SWC parsing performed by this package, so there is no AST implementation migration implied by the Vite upgrade.

Required work:

- rename `rollupOptions` to `rolldownOptions`;
- use `node:path` and `import.meta.dirname` in Vite and Vitest configs;
- preserve `node:path`, `@swc/core`, and `fast-glob` as external dependencies;
- add ESM and CommonJS smoke tests for the external SWC import shape;
- align `tsc && vite build` with `tsc --noEmit && vite build`.

Risk is medium rather than low because the package's public behavior depends on a large external CJS/native parser package and on source files that use explicit `.ts` extensions and workspace aliases. The existing 148 tests validate AST behavior; the added consumer test must validate package resolution and external interop.

Before:

```ts
import {resolve} from 'path';

build: {
  lib: {
    entry: resolve(__dirname, 'src/main.ts'),
  },
  rollupOptions: {
    external: ['node:path', ...(dependencies ? Object.keys(dependencies) : [])],
  },
}
```

After:

```ts
import {resolve} from 'node:path';

build: {
  lib: {
    entry: resolve(import.meta.dirname, 'src/main.ts'),
  },
  rolldownOptions: {
    external: ['node:path', ...(dependencies ? Object.keys(dependencies) : [])],
  },
}
```

### 7. `@ayu-sh-kr/dota-common-utils`

Sources: [`vite.config.ts`](../../../packages/utils/dota-common-utils/vite.config.ts), [`vitest.config.ts`](../../../packages/utils/dota-common-utils/vitest.config.ts), and [`package.json`](../../../packages/utils/dota-common-utils/package.json).

`dota-common-utils` currently exports an empty module (`export {}`), so Vite reports an empty generated chunk during the baseline build. The package has one passing placeholder test and no runtime dependencies.

Required work:

- rename `rollupOptions` to `rolldownOptions`;
- normalize `path`/`__dirname` in both configs;
- preserve the empty-entry output unless the package is being given a real public API as a separate change;
- add a package smoke test that confirms the empty ESM and CommonJS entry points remain loadable.

Migration risk is low. The empty chunk warning is a pre-existing package design signal, not a Vite 8 incompatibility, and should not be “fixed” by adding unrelated exports during the toolchain migration.

## Library and utility before-and-after checklist

Use the following checklist alongside the plugin migration checklist:

| Validation | Core | Event | REST | Router | Wrap | AST utils | Common utils |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tsc --noEmit` | Required | Required | Required | Required | Required | Required | Required |
| Unit tests | 365 | 181 | 26 | 116 | 2 | 148 | 1 |
| Vite 8 production build | Required | Required | Required | Required | Required, all 8 entries | Required | Required |
| Declaration output | Required | Required | Required | Required | Required, all subpaths | Required | Required |
| ESM import | Required | Required | Required | Required | Root + all subpaths | Required | Required |
| CommonJS import | Required | Required | Required | Required | Root + all subpaths | Required | Required |
| Browser runtime fixture | Required | Recommended | Not needed | Required | Required | Not needed | Not needed |
| External dependency fixture | Required | Required | Not needed | Required | Required | Required | Not needed |

The library/utility migration is complete only when the built packages are tested as consumers. A package-only `vitest run` proves source behavior under Vite's test runner, but it does not prove generated entry points, declaration paths, package exports, external dependency identity, or the custom `dota-wrap` subpath layout.

## Shared before-and-after migration

### Package version and peer contract

Current root/tooling shape:

```json
{
  "devDependencies": {
    "vite": "7.3.1",
    "vitest": "^4.0.6",
    "vite-plugin-dts": "^4.5.4"
  }
}
```

Each plugin currently advertises:

```json
{
  "peerDependencies": {
    "vite": "^7.1.0"
  }
}
```

For a Vite 8-only release, the target is:

```json
{
  "devDependencies": {
    "vite": "8.1.x",
    "vitest": "a Vite-8-compatible 4.x release",
    "vite-plugin-dts": "a validated declaration-tooling release"
  }
}
```

```json
{
  "peerDependencies": {
    "vite": "^8.0.0"
  }
}
```

If consumers must be able to remain on Vite 7, use `^7.1.0 || ^8.0.0` in all three peer contracts and keep the compatibility spelling until the support policy is intentionally narrowed. Do not publish a peer range that claims Vite 8 support before the real host-project fixtures pass.

### Shared config cleanup

Before:

```ts
import {resolve} from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      external: dependencies,
    },
  },
  resolve: {
    alias: {
      '@dota': resolve('./src'),
    },
  },
});
```

After:

```ts
import {resolve} from 'node:path';

export default defineConfig({
  build: {
    rolldownOptions: {
      external: dependencies,
    },
  },
  resolve: {
    alias: {
      '@dota': resolve(import.meta.dirname, 'src'),
    },
  },
});
```

The `node:path` and `import.meta.dirname` changes make ESM config intent explicit. The property rename is the Vite 8 migration change. The alias behavior itself is not expected to change.

### Build and test scripts

Before:

```json
{
  "build": "tsc && vite build",
  "test": "tsc --noEmit && vitest run"
}
```

After:

```json
{
  "build": "tsc --noEmit && vite build",
  "test": "tsc --noEmit && vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

The script change is not required by Vite 8, but it keeps TypeScript from emitting files and makes the three plugin packages consistent. The preloader and Web Type JSON packages currently lack the optional watch/coverage scripts; add them if the workspace expects every plugin to expose the standard validation surface.

## Recommended migration sequence

1. **Choose support policy.** Decide whether published plugins support Vite 8 only or both Vite 7 and Vite 8. Record the decision before changing peer ranges.
2. **Upgrade the root toolchain together.** Upgrade Vite, Vitest, coverage tooling, and the declaration toolchain as one lockfile change. Verify Node 20.19+ or 22.12+, which Vite 8 requires.
3. **Use a Rolldown compatibility probe.** For a larger workspace, first run the three host projects against `rolldown-vite` on Vite 7, then repeat with Vite 8. This isolates Rolldown failures from other Vite 8 changes.
4. **Migrate the package configs and custom builder.** Rename every plugin/library/utility `rollupOptions` block to `rolldownOptions`, update `dota-wrap/scripts/build.mjs`, make ESM path resolution explicit, and preserve the current external lists and output filenames.
5. **Add host-project and consumer fixtures.** Test each plugin inside a minimal Vite app and test each published library/utility from its packed ESM and CommonJS outputs. Package-only tests are necessary but do not prove module graph, watcher, alias, declaration, package-export, or external-dependency behavior.
6. **Resolve existing export warnings.** Decide whether `output.exports: 'named'` or an entry-point split best preserves the event-map and Web Type JSON public APIs.
7. **Run package and consumer checks.** Build each plugin, run all tests and coverage where available, pack each package, and consume both its ESM and CommonJS entry points.
8. **Publish only after peer validation.** Update the peer ranges and changelog entries after the Vite 8 host-project fixtures pass.

## Validation matrix

The migration is complete only when all of the following pass:

| Check | Preloader | Event map | Web Type JSON |
| --- | --- | --- | --- |
| `tsc --noEmit` | Required | Required | Required |
| Unit/hook tests | 4 current tests + host fixture | 42 current tests + host fixture | 83 current tests + host fixture |
| Coverage | Add standard script or document exception | Existing script | Add standard script or document exception |
| Vite 8 production build | Required | Required | Required |
| Virtual module resolution | Required | Not applicable | Not applicable |
| External scan-root watcher | Not applicable | Required | Required where configured |
| Generated artifact contents | Component/route virtual source | Declaration and optional locations JSON | Web Types, optional CEM, package metadata |
| ESM import | Required | Required | Required |
| CommonJS require | Required | Required | Required |
| Packed package smoke test | Required | Required | Required |

## Estimated change size

These are implementation estimates for the migration itself, excluding unrelated decorator or TypeScript-major work:

| Package | Code/config changes | Test/fixture work | Overall |
| --- | --- | --- | --- |
| Preloader | 2 manifest/config edits; no hook rewrite expected | Highest: virtual IDs, module graph, watcher metadata behavior | Medium |
| Event map generator | 2 manifest/config edits; optional export-warning fix | Medium: real watcher and alias-resolution fixture | Low to medium |
| Web Type JSON | 2 manifest/config edits; optional export-warning and CJS check | Medium: real artifact watcher and package metadata fixture | Low to medium |
| Shared root | Vite/Vitest/dts versions, lockfile, Node/tooling policy | Consumer and package smoke matrix | Medium |

### Libraries and utilities

| Package | Code/config changes | Test/fixture work | Overall |
| --- | --- | --- | --- |
| `dota-core` | Config rename and ESM path cleanup; no immediate runtime rewrite expected | Highest: decorators, custom elements, metadata, external runtime identity | Medium to high |
| `dota-event` | Config rename, ESM path cleanup, script consistency | Event decorator and `reflect-metadata` ESM/CJS consumer fixture | Low to medium |
| `dota-rest` | ESM path cleanup; no `rolldownOptions` block required | Packed fetch client ESM/CJS smoke test | Low |
| `dota-router` | Config rename; preserve core/metadata externalization | Browser navigation and decorated component consumer fixture | Medium |
| `dota-wrap` | Production script and dev config rename; preserve eight-entry/external/declaration logic | Highest: all subpaths, declaration rewrites, bundled plugins, package exports | Medium to high |
| `dota-ast-utils` | Config rename and ESM path cleanup; preserve SWC/fast-glob externalization | SWC native/CJS interop and packed consumer fixture | Medium |
| `dota-common-utils` | Config rename and ESM path cleanup | Empty-entry package loadability fixture | Low |

The likely first migration commit is still mostly mechanical: update the root toolchain, the Vite peer ranges that intentionally expose Vite, six library/utility `rollupOptions` properties plus the three plugin properties, and consistent scripts. The meaningful effort is the validation required to prove that virtual modules, external roots, generated files, decorated web components, browser navigation, multi-entry declarations, and CJS/ESM package consumers still behave correctly under Rolldown.

## Related documentation

- [TypeScript 6 and Vite 8 decorator migration plan](./typescript-6-vite-8-decorator-migration-plan.md) — broader workspace toolchain and decorator risks.
- [Vite migration from v7](https://vite.dev/guide/migration.html) — official compatibility and deprecation guidance.
- [Vite plugin API](https://vite.dev/guide/api-plugin.html) — hook, server, path-normalization, and Rolldown compatibility guidance.
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — official architecture, Node support, and migration overview.
