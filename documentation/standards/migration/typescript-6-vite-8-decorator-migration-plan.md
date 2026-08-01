# TypeScript 6 and Vite 8 decorator migration plan

This plan moves the workspace from TypeScript 5.9.3 and Vite 7.3.1 to TypeScript 6.0.3 and Vite 8.1.5 without combining the build-system change with the higher-risk conversion from legacy decorators to standard decorators.

The target versions and external constraints in this document were checked on 2026-07-28. TypeScript 7.0.2 is already the npm `latest`, but TypeScript 6 is the recommended first target because it is the direct next major, retains the TypeScript compiler API used by this repository's declaration and Jest tooling, and exposes the configuration changes that TypeScript 7 turns into hard errors.

## Recommendation

Deliver the migration in three independently releasable stages:

1. Adopt TypeScript 6.0.3 and Vite 8.1.5 while preserving `experimentalDecorators`.
2. Convert the Dota decorator runtime and workspace consumers to standard decorator semantics.
3. Adopt TypeScript 7 after compiler-API consumers have been removed, replaced, or explicitly kept on the TypeScript 6 compatibility package.

Do not remove `experimentalDecorators`, `emitDecoratorMetadata`, or `reflect-metadata` in the initial TypeScript/Vite upgrade. The current legacy implementation depends on the old decorator call shape, and Vite 8's Oxc transformer does not yet lower standard decorators without an additional Babel or SWC transform.

## Audited baseline

The workspace currently contains:

| Concern | Observed state |
| --- | --- |
| Workspace packages | 13 package manifests under `packages/` |
| TypeScript | 5.9.3 at the workspace root |
| Vite | 7.3.1 at the root and in the app; `dota-wrap` also declares it directly |
| TypeScript configs | 15 package configs, including one test fixture |
| Vite configs | 11 package configs |
| Legacy decorator configs | 12 configs enable both `experimentalDecorators` and `emitDecoratorMetadata` |
| Decorator implementations | 18 across `dota-core`, `dota-event`, and `dota-router` |
| Production annotations | 452 annotations across 97 app and UI source files |
| Rolldown option migration | 10 `rollupOptions` occurrences: nine Vite configs and the `dota-wrap` build script |
| Vite peer contracts | Four published packages currently constrain consumers to Vite 7 |
| Runtime metadata | Six packages depend on `reflect-metadata` |
| Test runners | Jest/ts-jest in `dota-core` and `dota-rest`; Vitest elsewhere |
| Lockfiles | One workspace lockfile plus stale package-local lockfiles in `dota-web` and `dota-ui` |

The primary source locations are:

- [`package.json`](../../../package.json) and [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml) for root versions and workspace policy.
- [`dota-core` decorators](../../../packages/libs/dota-core/src/core/decorators/index.ts) and [`HelperUtils`](../../../packages/libs/dota-core/src/core/utils/HelperUtils.ts) for component metadata.
- [`OnEvent`](../../../packages/libs/dota-event/src/listener/on-event.decorator.ts) and [`AutoBind`](../../../packages/libs/dota-event/src/listener/auto-bind.decorator.ts) for event metadata.
- [`Route`](../../../packages/libs/dota-router/src/route.decorator.ts) for route metadata.
- [`dota-wrap` build orchestration](../../../packages/libs/dota-wrap/scripts/build.mjs) for the multi-entry Vite JavaScript API and declaration assembly.
- The Dota Vite plugins in [`dota-vite-preloader`](../../../packages/plugins/dota-vite-preloader/src/main.ts), [`event-map-generator`](../../../packages/plugins/event-map-generator/src/main.ts), and [`web-type-json`](../../../packages/plugins/web-type-json/src/main.ts).

### Current validation

The existing `pnpm test` and `pnpm build` commands pass on the current lockfile. The build is not warning-free: packages using `vite-plugin-dts` with `rollupTypes: true` report that API Extractor analyzes TypeScript 5.9.3 output with a bundled TypeScript 5.8.2 engine.

A direct TypeScript 6.0.3 `tsc --noEmit` probe passed for eight package configs and identified five failing configs:

| Config | TypeScript 6 result | Required correction |
| --- | --- | --- |
| `packages/libs/dota-core/tsconfig.json` | Missing Jest globals | Add explicit `types`, or split source and Jest configs |
| `packages/libs/dota-rest/tsconfig.json` | Missing Jest and Node globals | Add explicit `types`, or migrate the package to Vitest |
| `packages/libs/dota-router/tsconfig.json` | `moduleResolution: "node"` is deprecated | Use `bundler` for Vite-built code |
| `packages/plugins/event-map-generator/tsconfig.json` | `baseUrl` is deprecated | Remove `baseUrl`; make every `paths` target explicitly relative |
| `packages/ui/dota-ui/tsconfig.json` | `baseUrl` is deprecated | Remove `baseUrl`; keep relative `paths` targets |

The root `tsconfig.json` also needs repair before it can become a shared base:

- `module: "ESNext"` conflicts with `moduleResolution: "NodeNext"`.
- `baseUrl` is deprecated in TypeScript 6 and removed in TypeScript 7.
- Its paths omit the `packages/` segment.
- `typeRoots: ["node_modules/@types"]` prevents package-provided type entries such as `vitest` from resolving.

The same package-config probe under TypeScript 7 produces the same missing-global failures, but `moduleResolution: "node"` and `baseUrl` become hard removal errors.

### Vite 8 compatibility probe

`dota-web` was built with Vite 8.1.5 without changing repository configuration. The probe:

- transformed 390 modules;
- ran the component preloader, event-map generator, and Web Types plugin;
- compiled the current legacy-decorated application;
- produced a complete production bundle.

This proves the current app and custom plugin hooks can run through Rolldown's compatibility layer. It does not remove the need to migrate deprecated option names or validate development watcher behavior.

## Migration risks

### 1. Decorator semantics are a runtime change

The legacy member decorators receive a prototype, property key, and optional descriptor. Standard decorators receive the decorated value and a context object. Existing implementations such as `Property`, `AfterInit`, `OnEvent`, and `HostListener` cannot be made standard by changing only their TypeScript return types.

Important current behaviors that must remain stable include:

- `@Property` populates `observedAttributes` before `customElements.define`.
- `@Component` stores selector and shadow settings on the constructor.
- lifecycle and listener decorators store callable methods for `BaseElement`.
- `@OnEvent` metadata is available on ordinary service classes as well as components.
- `@Route` metadata remains readable by `RouterUtils`.
- metadata for sibling and derived classes does not leak between classes.
- the source scanners continue to recognize `@Component`, `@Property`, `@Route`, and `@OnEvent`.

### 2. `emitDecoratorMetadata` is not the Dota metadata store

The repository reads and writes application metadata through `Reflect.defineMetadata` and `HelperUtils.fetchOrCreate`. No source reads TypeScript's `design:type`, `design:paramtypes`, or `design:returntype` metadata.

This means `emitDecoratorMetadata` appears unnecessary for in-repository behavior, but it should be removed only in the standard-decorator stage after:

- a public compatibility decision is recorded for external consumers;
- emitted-bundle tests confirm that no design metadata is required;
- `reflect-metadata` has been separated from the Dota registry or retained intentionally.

Vite 8 only partially supports inferred `emitDecoratorMetadata` because its transform is file-local. Standard decorators are also incompatible with TypeScript's legacy `emitDecoratorMetadata` mode.

### 3. Declaration generation embeds TypeScript APIs

The package build is not only `tsc` plus Vite:

- `dota-core` and `dota-rest` use `tsup --dts`.
- ten Vite-based package builds use `vite-plugin-dts`, including the scripted `dota-wrap` build.
- several enable declaration rollup through API Extractor.
- `dota-wrap` builds eight entries and then rewrites and copies declarations from sibling packages.
- the installed `ts-jest` line supports TypeScript versions below 6.

TypeScript 6 keeps the API available, so these tools can be upgraded and tested in place. TypeScript 7.0 does not expose a stable programmatic API, which is why TypeScript 7 belongs in a later gated stage.

### 4. Vite 8 changes the transform and bundling engines

Vite 8 replaces esbuild and Rollup with Oxc and Rolldown. Compatibility aliases allow the current `rollupOptions` and legacy decorator settings to build, but those aliases are deprecated.

Repository-specific checks are required for:

- library `external` rules and CJS/ES output names;
- `dota-wrap`'s repeated JavaScript API builds;
- virtual module loading and full reloads in `dota-vite-preloader`;
- watcher paths outside the app root in the generator plugins;
- output shape and exports from the three published plugins;
- CSS output from `dota-ui` and `dota-md`;
- CommonJS interop for package consumers;
- declaration output and packed package contents.

### 5. The lockfile does not describe one toolchain

The root lockfile resolves TypeScript 5.9 and Vite 7. The package-local lockfiles still resolve older combinations, including Vite 6 and TypeScript 5.5/5.7. Keeping them allows local installs to test a different compiler and bundler from CI.

The workspace should have one authoritative root lockfile unless a package is deliberately tested as a standalone consumer fixture.

## Target toolchain

### Immediate target

| Tool | Target | Notes |
| --- | --- | --- |
| TypeScript | 6.0.3 | Direct next major; migrate without `ignoreDeprecations` |
| Vite | 8.1.5 | Current stable Vite 8 release at audit time |
| Vitest | 4.1.10 or newer compatible 4.x | Current 4.0.6 peer range excludes Vite 8 |
| `@vitest/coverage-v8` | Same version as Vitest | Keep runner and coverage package aligned |
| `vite-plugin-dts` | 5.0.3 or newer compatible 5.x | Current 4.5.4 peer range excludes Vite 8 |
| `ts-jest` | 29.4.12 or newer compatible release | Supports TypeScript 6 but not TypeScript 7 |
| `rollup-plugin-dts` | 6.4.1 or newer compatible release | Adds a TypeScript 6 peer range; remove if unused |
| Node.js | Pin a supported line | Vite 8 requires Node 20.19+ or 22.12+ |
| pnpm | Pin the workspace version | Add a root `packageManager` field and use one lockfile |

Prefer exact root versions for the compiler, Vite, Vitest, and declaration tooling. Use workspace protocol or a pnpm catalog so package manifests do not drift.

### TypeScript 7 follow-up target

As of the audit, TypeScript 7.0.2:

- is the current npm `latest`;
- produces hard errors for the deprecated TypeScript 6 configuration used here;
- has no stable compiler API in 7.0;
- requires side-by-side TypeScript 6 for API-dependent tooling.

After the TypeScript 6 migration is green, add a non-blocking TypeScript 7 CI lane using the official `@typescript/typescript6` compatibility arrangement if needed. Promote it to the primary compiler only when:

- Jest/ts-jest is gone or confirmed compatible;
- declaration tools no longer import the TypeScript 6 API, or are deliberately isolated to the compatibility package;
- editor support used by contributors is acceptable;
- all package and fixture configs compile without removed options.

## Before and after

### TypeScript configuration

The first-stage configuration keeps legacy semantics while fixing TypeScript 6 defaults.

Before:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@dota/*": ["./src/*"]
    }
  },
  "include": ["src", "test"]
}
```

After the TypeScript 6 stage:

```json
{
  "extends": "../../../tsconfig.browser.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["node", "vitest/globals"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@dota/*": ["./src/*"]
    }
  },
  "include": ["src", "test"]
}
```

After the standard-decorator stage:

```json
{
  "extends": "../../../tsconfig.browser.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["node", "vitest/globals"],
    "lib": ["ES2023", "DOM", "ESNext.Decorators"],
    "paths": {
      "@dota/*": ["./src/*"]
    }
  },
  "include": ["src", "test"]
}
```

In the final form, both legacy decorator flags are absent. `experimentalDecorators: false` should not be written; absence selects standard semantics.

### Decorator implementation

The current property decorator mutates the prototype's constructor directly:

```ts
function PropertyDecorator(config: PropertyConfig): PropertyDecorator {
  return (target, propertyKey) => {
    if (!target.constructor.observedAttributes) {
      target.constructor.observedAttributes = []
    }

    target.constructor.observedAttributes.push(config.name)
    HelperUtils.fetchOrCreate<PropertyDetails>(target, 'Property').set(
      config.name,
      {
        name: config.name,
        prototype: propertyKey.toString(),
        default: config.default,
        type: config.type,
      },
    )
  }
}
```

The standard form records member metadata in the class decorator metadata object. `@Component` then finalizes the constructor and `observedAttributes` after member decorators have run:

```ts
const DOTA_METADATA: unique symbol = Symbol('dota:metadata')

type DotaDecoratorMetadata = Record<PropertyKey, unknown> & {
  [DOTA_METADATA]?: DotaClassMetadata
}

function getOrCreateDotaMetadata(
  metadata: Record<PropertyKey, unknown>,
): DotaClassMetadata {
  const store = metadata as DotaDecoratorMetadata
  if (!Object.hasOwn(store, DOTA_METADATA)) {
    const inherited = store[DOTA_METADATA]
    store[DOTA_METADATA] = inherited
      ? cloneDotaClassMetadata(inherited)
      : createDotaClassMetadata()
  }
  return store[DOTA_METADATA]!
}

function Property(config: PropertyConfig) {
  return (
    _initialValue: undefined,
    context: ClassFieldDecoratorContext,
  ): void => {
    const metadata = getOrCreateDotaMetadata(context.metadata)
    metadata.properties.set(config.name, {
      name: config.name,
      property: String(context.name),
      default: config.default,
      type: config.type,
    })
  }
}

function Component(config: ComponentConfig) {
  return <T extends DotaElementConstructor>(
    value: T,
    context: ClassDecoratorContext<T>,
  ): void => {
    const metadata = getOrCreateDotaMetadata(context.metadata)

    value.__dotaSelector = config.selector
    value.__dotaShadow = config.shadow
    Object.defineProperty(value, 'observedAttributes', {
      configurable: true,
      value: [...metadata.properties.keys()],
    })

    DotaMetadataRegistry.set(value, metadata)
  }
}
```

This is the intended design shape, not a drop-in patch. The implementation must also:

- clone inherited metadata before mutation;
- support symbol-named members;
- define how classes without `@Component` expose method metadata;
- keep a legacy adapter during the dual-mode release;
- initialize `Symbol.metadata` for runtimes that do not provide it.

### Consumer code

The public authoring syntax should remain unchanged.

Before:

```ts
@Component({selector: 'user-card', shadow: true})
export class UserCard extends BaseElement {
  @Property({name: 'user-id', type: String})
  userId = ''

  @AfterInit()
  afterViewInit(): void {
    this.loadUser()
  }
}
```

After:

```ts
@Component({selector: 'user-card', shadow: true})
export class UserCard extends BaseElement {
  @Property({name: 'user-id', type: String})
  userId = ''

  @AfterInit()
  afterViewInit(): void {
    this.loadUser()
  }
}
```

Although the source usage is the same, the emitted JavaScript and decorator function contracts differ. That is why a runtime compatibility release must precede the workspace config flip.

### Vite configuration

Before:

```ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@ayu-sh-kr/dota-core'],
    },
  },
})
```

After:

```ts
export default defineConfig({
  build: {
    rolldownOptions: {
      external: ['@ayu-sh-kr/dota-core'],
    },
  },
})
```

The compatibility alias means this rename does not have to occur in the first Vite 8 commit, but it should be completed before the migration is considered done.

When the workspace switches to standard decorators, add an explicit transform because Vite 8's Oxc transformer does not currently lower them:

```ts
import swc from '@rollup/plugin-swc'
import {defineConfig, withFilter} from 'vite'

export default defineConfig({
  plugins: [
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: {
              syntax: 'typescript',
              decorators: true,
            },
            transform: {
              decoratorVersion: '2023-11',
            },
          },
        },
      }),
      {transform: {code: '@'}},
    ),
  ],
})
```

Put this transform in one shared factory and reuse it in app, library, and Vitest configurations. Do not copy slightly different decorator transforms into every package.

### Published Vite peer dependency

During the compatibility release:

```json
{
  "peerDependencies": {
    "vite": "^7.3.0 || ^8.1.0"
  }
}
```

After Vite 7 support is intentionally dropped:

```json
{
  "peerDependencies": {
    "vite": "^8.1.0"
  }
}
```

The compatibility range applies to `dota-wrap`, `dota-vite-preloader`, `event-map-generator`, and `web-type-json`.

## Delivery plan

### Phase 0: Stabilize the baseline

1. Pin Node and pnpm at the workspace root and use the same versions in all workflows.
2. Choose the root `pnpm-lock.yaml` as the authoritative lockfile.
3. Remove package-local lockfiles unless they become intentional standalone fixtures with their own CI jobs.
4. Capture the current outputs for every published package:
   - ESM and CJS filenames;
   - export map resolution;
   - declaration entry points;
   - CSS artifacts;
   - packed tarball contents.
5. Add a CI job for `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm build`.
6. Make generation deterministic or add a clean-tree assertion after builds. The current build rewrites tracked event-map declarations when generator output differs from committed files.

Exit gate: the baseline is reproducible from a clean clone and a build leaves no unexplained tracked changes.

### Phase 1: Normalize TypeScript configuration

1. Create small shared configs for:
   - browser/bundler production source;
   - Node-based Vite plugins and build scripts;
   - Vitest tests;
   - Jest tests while Jest remains.
2. Remove `baseUrl` and make all `paths` values explicitly relative to each config.
3. Change `dota-router` from `moduleResolution: "node"` to `bundler`.
4. Remove the root `typeRoots` override and list required globals explicitly in `types`.
5. Split source and test configs where test globals should not enter published declarations.
6. Set explicit `rootDir` values; TypeScript 6 no longer infers the old source root.
7. Align `module`, `moduleResolution`, and package `"type"` values.
8. Remove contradictory `noEmit`, `declaration`, `declarationDir`, and `outDir` settings from configs that only type-check.
9. Keep `experimentalDecorators` and `emitDecoratorMetadata` enabled in the shared legacy-decorator config.

Exit gate: every package config passes TypeScript 5.9 and TypeScript 6.0.3 without `ignoreDeprecations`.

### Phase 2: Upgrade TypeScript 6 and API-dependent tools

1. Upgrade TypeScript to 6.0.3.
2. Upgrade `ts-jest` before running the Jest packages under TypeScript 6.
3. Upgrade `tsup`, `rollup-plugin-dts`, `vite-plugin-dts`, and API Extractor to the newest mutually compatible versions.
4. Decide whether declaration rollup is required package by package:
   - keep it where a single public declaration is part of the package contract;
   - disable it where a declaration tree is valid and avoids an older embedded compiler;
   - preserve the specialized `dota-wrap` declaration assembly until a replacement is proven.
5. Add declaration-only fixtures that import every public export and subpath.
6. Record compiler and declaration timings before and after the upgrade.

Exit gate: type-check, tests, declaration generation, package builds, and packed-consumer fixtures pass under TypeScript 6.

### Phase 3: Upgrade Vite in compatibility mode

1. Upgrade root and package Vite versions to 8.1.5.
2. Upgrade Vitest and `@vitest/coverage-v8` together to versions whose peer range includes Vite 8.
3. Upgrade `vite-plugin-dts` to a Vite 8-compatible release.
4. Widen the four published Vite peer ranges for a compatibility release.
5. Keep `rollupOptions` temporarily if smaller reviewable commits are preferable.
6. Run all Vite package builds and the `dota-wrap` JavaScript API build.
7. Exercise development mode, not only production builds:
   - add, change, and remove a component file;
   - verify both virtual modules invalidate;
   - verify external scan roots regenerate event and Web Types artifacts;
   - verify full reload behavior.
8. Compare Vite 7 and Vite 8 bundle exports and runtime smoke tests.

Exit gate: all packages build and test under Vite 8, plugin development watchers work, and existing legacy decorators behave identically.

### Phase 4: Adopt native Rolldown configuration

1. Rename all ten `rollupOptions` occurrences to `rolldownOptions`.
2. Replace any newly surfaced Rollup-specific options with their Rolldown equivalents.
3. Keep library `external` arrays and regular expressions covered by packed-consumer tests.
4. Check CJS default import behavior for the three plugins and all library packages.
5. Decide whether direct root dependencies on Rollup and its plugins are still used; remove only after source and build-script checks confirm they are unnecessary.
6. Set an explicit browser/build target instead of silently accepting Vite 8's newer Baseline default.

Exit gate: Vite 8 emits no deprecated build-option warnings, and package output contracts remain stable.

### Phase 5: Introduce a dual-mode Dota metadata runtime

1. Add a typed `DotaMetadataRegistry` keyed by constructors, with stable symbol keys instead of constructor-name strings.
2. Define one metadata model for component, property, lifecycle, listener, event, and route records.
3. Implement dual-call-shape decorators that can detect legacy versus standard context at runtime.
4. Keep a `reflect-metadata` adapter so legacy consumers and the standard implementation resolve the same logical metadata.
5. Migrate decorator families in dependency order:
   1. `dota-event` method and class decorators;
   2. `dota-core` method decorators;
   3. `dota-core` field decorators;
   4. `dota-core` `@Component` finalization;
   5. `dota-router` `@Route`.
6. Publish the dual-mode runtime before compiling workspace consumers with standard semantics.

Exit gate: the same published decorator functions pass both a legacy-compiled fixture and a standard-compiled fixture.

### Phase 6: Switch workspace consumers to standard decorators

1. Add the shared SWC standard-decorator transform to Vite and Vitest.
2. Remove `experimentalDecorators` and `emitDecoratorMetadata` from one leaf consumer first.
3. Migrate in increasing blast-radius order:
   - focused runtime tests;
   - `dota-md`;
   - `dota-ui`;
   - `dota-web`;
   - `dota-wrap` packed integration.
4. Keep author syntax unchanged.
5. Verify the three AST scanners against standard-decorator source and emitted output.
6. Remove the legacy metadata adapter only after supported downstream versions no longer require it.
7. Remove `reflect-metadata` from packages that no longer use its API.

Exit gate: no workspace config enables legacy decorators, all 452 production annotations behave correctly, and no emitted bundle contains unintended legacy decorator helpers or design metadata.

### Phase 7: Prepare and adopt TypeScript 7

1. Migrate `dota-core` and `dota-rest` from Jest/ts-jest to Vitest, or isolate them on the official TypeScript 6 compatibility package.
2. Inventory every dependency that imports `typescript` as an API.
3. Run TypeScript 7 as a non-blocking CI check over all source, test, config, and fixture projects.
4. Resolve declaration-tool compatibility or replace API-driven declaration bundling with compiler-CLI output.
5. Promote TypeScript 7 only when the non-blocking lane is consistently green.

Exit gate: TypeScript 7 is the primary compiler and no build tool accidentally resolves an unavailable compiler API.

## Verification matrix

| Area | Required checks |
| --- | --- |
| `dota-core` | 365 current tests; observed attributes; lifecycle ordering; property/state/watch behavior; metadata inheritance; ESM/CJS consumer |
| `dota-event` | `OnEvent` and `AutoBind`; scoped/global handlers; inheritance; bind/unbind identity |
| `dota-router` | `Route` metadata; flat/tree preparation; route rendering; ESM/CJS consumer |
| Vite plugins | production build; dev add/change/unlink; virtual modules; external roots; generated artifacts |
| `dota-ui` and `dota-md` | component registration; CSS outputs; declaration imports; representative browser runtime |
| `dota-wrap` | every export subpath; single runtime instance; bundled plugins; declaration rewrites; packed install |
| `dota-web` | full Vite 8 build; startup; routing; component preload; event map; Web Types and Custom Elements Manifest |
| Toolchain | clean install; type-check; unit tests; coverage; build; pack; no dirty tree |

Decorator-specific contract tests should cover:

- field, method, and class decorator evaluation order;
- base class and subclass metadata isolation;
- sibling class isolation;
- symbol member names;
- multiple decorators on one member;
- class replacement by `@AutoBind`;
- static `observedAttributes` availability before the first instance;
- source scanner output before and after the semantic switch;
- legacy and standard consumer fixtures loading the same published package.

## Rollback boundaries

Each phase has a safe rollback:

- TypeScript 6 can be reverted independently while normalized configs remain useful.
- Vite 8 can be reverted before native-only Rolldown options are adopted.
- The dual decorator runtime can ship without switching workspace compilation semantics.
- Standard consumers can be migrated package by package while dual-mode decorators remain published.
- TypeScript 7 remains optional until API-dependent tooling is ready.

Avoid a single changeset that upgrades TypeScript, upgrades Vite, renames all bundler options, rewrites decorators, changes metadata storage, and removes `reflect-metadata`. That shape would make type errors, transform failures, metadata regressions, and package-output changes indistinguishable.

## Upstream references

- [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [TypeScript 5.0 standard decorator semantics and legacy differences](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [TypeScript 7.0 announcement and compatibility-package guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- [Vite 7-to-8 migration guide](https://vite.dev/guide/migration.html)
- [Vite TypeScript and decorator transform behavior](https://vite.dev/guide/features.html#typescript)

## Related repository documentation

- [`dota-wrap` architecture](../../packages/libs/dota-wrap/architecture/dota-wrap-hld.svg)
- [Vite plugin type/version conflict guidance](../../packages/plugins/web-type-json/diagnostics/vite-plugin-type-version-conflict.md)
- [Event map generator architecture](../../packages/plugins/event-map-generator/architecture/overview.md)
- [`dota-vite-preloader` virtual module flow](../../packages/plugins/dota-vite-preloader/build/virtual-modules-flow.svg)
