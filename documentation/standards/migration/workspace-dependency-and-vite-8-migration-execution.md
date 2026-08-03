# Workspace dependency and Vite 8 migration execution record

This document records the work that brought the Dota workspace from a mixed, root-hoisted Vite 7 dependency graph to the current centrally versioned Vite 8 state. It describes the sequence in which the work was performed, the decisions made at each step, the branch update and conflict resolution, the integration failure discovered after the update, and the evidence used to verify the final state.

The record is intentionally about completed work. The original Vite migration kept TypeScript at `5.9.3`; the later compiler-only follow-up moved the workspace to TypeScript `6.0.3` while preserving legacy decorators. Standard decorators and later runtime changes remain separate future work. The TypeScript follow-up is recorded in the [TypeScript 6 migration audit with legacy decorators preserved](./typescript-6-legacy-decorator-migration-audit.md).

## Result at a glance

| Concern | Starting state | Current state |
| --- | --- | --- |
| Default branch | `master` at `3218780` | Unchanged; it remains the common ancestor |
| Migration branch | Local branch was 13 commits behind `origin/migration/vite-tailwind` | Local branch is fast-forwarded to `67e435f` and matches its remote |
| Dependency versions | Versions repeated across root and child manifests | 30 external versions owned by one pnpm catalog |
| Internal dependencies | Workspace packages already used `workspace:*` | Preserved as `workspace:*` |
| Package manager | No root package-manager pin | `pnpm@11.9.0` pinned in the root manifest |
| Lockfiles | Root lockfile plus package-local lockfiles in `dota-web` and `dota-ui` | One authoritative root lockfile |
| Vite | Mixed `7.3.1`, `^7.3.1`, and Vite 7 peer ranges | Vite `8.2.0`, with a Vite 8 peer catalog |
| Vitest | `4.0.6` supplied inconsistently | Vitest and coverage `4.1.10` |
| Declaration plugin | `vite-plugin-dts` `4.5.4` and `rollupTypes` | `vite-plugin-dts` `5.0.3` and `bundleTypes` |
| API Extractor | Transitive and version-mismatched in declaration builds | Explicit `7.58.9` for every package that bundles declarations |
| TypeScript | `5.9.3` | `6.0.3` after the compiler-only follow-up; legacy decorators preserved |
| Production bundler config | `build.rollupOptions` | `build.rolldownOptions` |
| JavaScript transform semantics | Implicit legacy decorator behavior | Explicit `oxc.decorator.legacy: true` |
| Browser build target | Inherited from the Vite 7 default | Explicit Vite 7 baseline: Chrome 107, Edge 107, Firefox 104, Safari 16 |
| Validation | Package checks against the old graph | Frozen install, 1,062 tests, and all 13 workspace builds pass |

## Scope and boundaries

The completed work includes:

1. auditing the dependency graph before editing it;
2. creating a single version source in [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml);
3. making the root manifest represent the complete external dependency set;
4. making each child manifest declare the dependencies it directly owns;
5. migrating Vite, Vitest, and declaration-generation tooling to Vite 8-compatible versions;
6. updating Vite and Vitest configuration for Rolldown and Oxc;
7. preserving the current decorator runtime and browser target;
8. adapting the event-map generator to Vite 8's resolved aliases;
9. updating the local migration branch from its remote branch;
10. resolving the dependency/configuration conflicts produced by that update;
11. repairing the declaration integration between `dota-core`, `dota-rest`, `dota-wrap`, and `dota-web`;
12. removing tooling that became obsolete when the remote branch completed the Jest/tsup-to-Vite/Vitest migration;
13. validating the combined result across the whole workspace.

The original Vite work deliberately excluded:

- changing TypeScript from `5.9.3`; this was completed later as a separately verified follow-up;
- adopting TypeScript standard decorators;
- removing `experimentalDecorators` or changing decorator metadata behavior;
- changing the public runtime APIs of the Dota packages;
- performing the standard-decorator or TypeScript 7 phases described in the [decorator migration plan](./typescript-6-vite-8-decorator-migration-plan.md); the compiler-only TypeScript 6 follow-up was completed later;
- committing or pushing the current working-tree changes.

## Source documents

This execution record connects three documents with different purposes:

- The [workspace dependency audit](../dependencies/workspace-dependency-audit.md) records the dependency baseline, policy, acceptance checks, and final summary.
- The [Vite 8 plugin, library, and utility audit](./vite-8-plugin-migration-audit.md) records the pre-migration compatibility investigation and package-by-package risks.
- The [TypeScript 6 migration audit with legacy decorators preserved](./typescript-6-legacy-decorator-migration-audit.md) owns the current compiler-only audit against the completed Vite 8 workspace.
- The older [TypeScript 6 and Vite 8 decorator migration plan](./typescript-6-vite-8-decorator-migration-plan.md) continues to own the later standard-decorator design.

## Step 1: Establish the repository and branch baseline

The repository uses `master`, not a branch named `main`, as its default branch. After fetching `origin`, the relevant branch relationships were:

```text
origin/master                       3218780  Version Packages (#100)
                                      |
                                      +-- 5da43a4  SSR/SSG migration plan
                                      +-- a5950b6  TypeScript/Vite decorator plan
                                      +-- 13 additional migration commits
                                      +-- 67e435f  origin/migration/vite-tailwind
```

Before the update:

- the local branch was `migration/vite-tailwind` at `a5950b6`;
- `origin/master` had no commits beyond the branch's common base;
- the local migration branch was two commits ahead of `master`;
- `origin/migration/vite-tailwind` was 13 commits ahead of the local migration branch;
- the catalog and Vite 8 work existed as uncommitted changes in the local working tree.

This distinction mattered. Merging `master` would have changed nothing because `master` was already an ancestor. The meaningful branch operation was updating the local migration branch to its own remote tip.

## Step 2: Audit the dependency graph before changing versions

The dependency audit covered the root manifest and all 13 package manifests. The starting graph contained:

- 14 projects when the workspace root is included;
- 49 declared dependency names;
- 38 external packages and 11 internal Dota packages;
- only 21 of the 38 external packages represented in the root manifest;
- three lockfiles;
- repeated version ranges and one use of `latest`;
- Vite declared as `7.3.1`, `^7.3.1`, and the peer range `^7.1.0` in different places.

The audit also found direct-ownership gaps that were being hidden by the root `node_modules` layout:

- six packages had Vite configuration but did not directly declare Vite;
- nine packages imported `vite-plugin-dts` without directly declaring it;
- nine packages used Vitest configuration or tests without directly declaring Vitest;
- TypeScript, coverage, DOM test environments, Jest, and tsup were often available only because the root installed them.

This was not only a cosmetic version problem. A filtered install or isolated package build could fail because a package's manifest did not describe the tools used by its own scripts and configuration.

The audit was written before the update so the repository retains an evidence-based before/after record instead of documenting only the desired result.

## Step 3: Define the dependency-ownership policy

The dependency graph was normalized around six rules.

### 3.1 One external version source

Every external version is defined in the default `catalog` inside [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml). Manifests refer to these values using `catalog:`.

This makes version changes workspace operations. A Vite or Vitest upgrade now changes one catalog entry instead of a collection of unrelated semver ranges.

### 3.2 The root contains the complete external dependency set

The root [`package.json`](../../../package.json) declares every external dependency used across the workspace through `catalog:` references. The root therefore describes the complete development and runtime installation set without becoming the source of version numbers itself.

The version remains in the catalog; the root manifest expresses membership in the workspace-wide toolchain.

### 3.3 Child packages retain direct ownership

Central version ownership does not replace package ownership. Each child package continues to declare the runtime, development, or peer dependencies it directly imports or invokes.

For example, a package using `vite build`, `vitest run`, `vite-plugin-dts`, and bundled declaration generation directly declares those tools even though their versions come from the catalog. This keeps filtered builds and package-level publishing honest.

### 3.4 Internal packages use the workspace protocol

Dependencies between Dota packages remain `workspace:*`. The catalog is for external packages; it is not used to replace workspace linking.

### 3.5 Peer compatibility ranges are separate from installed versions

Two named catalogs represent intentional public compatibility contracts:

| Named catalog | Contract | Consumers |
| --- | --- | --- |
| `peer-vite` | `vite: ^8.1.0` | `dota-wrap` and the three published Vite plugins |
| `peer-reflect-metadata` | `reflect-metadata: >=0.2.0` | `dota-wrap` |

The exact installed Vite version is `8.2.0`, while the published peer contract accepts compatible Vite 8 releases. Those two concerns should not be collapsed into one exact value.

### 3.6 One lockfile and one pnpm version

The root manifest now pins `pnpm@11.9.0`. The package-local lockfiles in [`dota-web`](../../../packages/apps/dota-web/) and [`dota-ui`](../../../packages/ui/dota-ui/) were removed, leaving the root [`pnpm-lock.yaml`](../../../pnpm-lock.yaml) as the only resolution record.

## Step 4: Select and centralize the final dependency versions

The completed catalog contains 30 external dependencies. The build and test toolchain is:

| Dependency | Version | Role |
| --- | ---: | --- |
| `vite` | `8.2.0` | Development server, application builds, and library builds |
| `vitest` | `4.1.10` | Package test runner |
| `@vitest/coverage-v8` | `4.1.10` | Vitest coverage provider aligned with Vitest |
| `vite-plugin-dts` | `5.0.3` | Declaration generation for published packages |
| `@microsoft/api-extractor` | `7.58.9` | Declaration analysis and bundling behind `bundleTypes` |
| `typescript` | `5.9.3` | Existing compiler version, intentionally unchanged |
| `@swc/core` | `1.13.5` | Source scanning used by Dota build plugins |
| `esbuild` | `0.28.1` | Toolchain dependency used by Vite/plugin loading paths |
| `happy-dom` | `20.0.7` | Browser-like Vitest environment |
| `@types/node` | `24.9.0` | Node APIs used by build and test configuration |

The remaining catalog entries cover release tooling, runtime dependencies, Markdown processing, CSS processing, web-component metadata, and type packages:

```text
@changesets/cli              2.29.7
@floating-ui/dom             1.7.5
@tailwindcss/typography      0.5.19
@types/dom-navigation        1.0.6
@types/markdown-it           14.1.2
@types/web                   0.0.281
ajv                          8.13.0
autoprefixer                 10.4.24
consola                      3.4.2
custom-elements-manifest     2.1.0
fast-glob                    3.3.3
highlight.js                 11.11.1
jiti                         2.6.1
markdown-it                  14.3.0
markdown-it-anchor           9.2.0
markdown-it-highlightjs      4.3.0
markdown-it-toc-done-right   4.2.0
postcss                      8.5.10
reflect-metadata             0.2.2
tailwindcss                  3.4.19
```

The lockfile was regenerated from the manifests after each material dependency change. It was not resolved by manually combining conflict blocks.

## Step 5: Update every package manifest

Every external dependency string in a child manifest was replaced with `catalog:` or a named peer catalog. Internal package references stayed on `workspace:*`.

The current package-level build and test ownership is:

| Package | Build command | Test command | Declaration handling |
| --- | --- | --- | --- |
| `dota-web` | `tsc && vite build` | No package test script | Application build; no declaration bundle |
| `dota-core` | `tsc --noEmit && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-event` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-rest` | `tsc --noEmit && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-router` | `tsc --noEmit && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-wrap` | `tsc --noEmit && node scripts/build.mjs` | `tsc --noEmit && vitest run` | Custom declaration assembly |
| `dota-vite-preloader` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `event-map-generator` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `web-type-json` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-md` | `tsc && vite build` | No package test script | API Extractor bundle |
| `dota-ui` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-ast-utils` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |
| `dota-common-utils` | `tsc && vite build` | `tsc --noEmit && vitest run` | API Extractor bundle |

The eleven packages that enable `bundleTypes: true` directly declare `@microsoft/api-extractor`. `dota-wrap` intentionally does not because its declaration process is different and is described in Step 9.

## Step 6: Migrate the shared Vite configuration shape

The migration applied the same compatibility decisions to application, library, utility, UI, and plugin builds.

### 6.1 Use Rolldown's configuration name

Vite 8 uses Rolldown for production bundling. Every existing block named `build.rollupOptions` was renamed to `build.rolldownOptions`.

The contents of those blocks were preserved. External package lists, named exports, globals, and UI input entries were not redesigned as part of this migration.

### 6.2 Preserve the former default browser target

The Vite 7 browser baseline was made explicit:

```ts
build: {
  target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
}
```

This prevents the Vite 8 upgrade from silently broadening or narrowing output compatibility. A later browser-support change can now be reviewed independently.

### 6.3 Preserve legacy decorator transforms

Vite 8 uses Oxc for source transforms. Dota's current source still relies on legacy TypeScript decorator behavior, so build and test configurations explicitly set:

```ts
oxc: {
  decorator: {
    legacy: true,
  },
}
```

This is a compatibility setting, not the standard-decorator migration. It holds runtime semantics steady while the build engine changes.

### 6.4 Use ESM-safe configuration paths

ESM configurations now resolve paths through `import.meta.dirname` or `import.meta.url` rather than `__dirname`. JSON manifest imports used by externalization logic use import attributes:

```ts
import {dependencies} from './package.json' with {type: 'json'};
```

The final scans found no remaining `__dirname`, `rollupOptions`, or `rollupTypes` in Vite or Vitest configuration.

### 6.5 Keep CommonJS package output separate from config module syntax

`dota-core` and `dota-rest` publish CommonJS output as `dist/index.js`, so adding `"type": "module"` to those packages would have changed how Node interprets their published files. Instead, only their tooling configurations were renamed:

```text
vite.config.ts    -> vite.config.mts
vitest.config.ts  -> vitest.config.mts
```

Vite and Vitest discover `.mts` configuration files. This makes the configs unambiguously ESM and removes the native config-loader warning without changing either package's published module contract.

## Step 7: Migrate declaration generation

`vite-plugin-dts` 5 renamed its declaration-bundling option:

```ts
// Before
dts({
  insertTypesEntry: true,
  rollupTypes: true,
})

// Current
dts({
  insertTypesEntry: true,
  bundleTypes: true,
})
```

`bundleTypes` delegates declaration analysis and rollup to Microsoft API Extractor. API Extractor reads the declaration graph produced from TypeScript sources and emits a stable public `index.d.ts` surface.

It is a build-time dependency only. No application or library runtime imports it.

Version `7.58.9` was chosen because the installed toolchain analyzes the existing TypeScript `5.9.3` declarations with its bundled TypeScript `5.9.3` engine. This removed the earlier declaration-build warning where API Extractor analyzed TypeScript 5.9 output with a bundled TypeScript 5.8 engine.

The later TypeScript 6 follow-up intentionally keeps API Extractor `7.58.9`. API Extractor still owns a private TypeScript `5.9.3` engine, so declaration builds now print a known version-gap warning. The builds, declaration comparison, and focused public consumer check all pass; the warning remains documented until API Extractor publishes a stable TypeScript 6 engine.

## Step 8: Adapt the event-map generator to Vite 8 aliases

During Vite 8 validation, the event-map generator received internal Vite aliases such as:

```text
/^\/?@vite\/env/
/^\/?@vite\/client/
```

The AST resolver supports deterministic string-prefix aliases. It cannot use arbitrary regular-expression aliases to resolve application source imports.

The previous behavior warned for every unsupported regular-expression alias. Under Vite 8 that meant warnings for aliases owned by Vite itself, even though those aliases are not application event-source aliases and cannot contribute to scanning.

The plugin now distinguishes two cases in [`src/main.ts`](../../../packages/plugins/event-map-generator/src/main.ts):

1. Vite-owned internal aliases matching the prefix defined by `ViteAliasConstants` are skipped silently.
2. Unsupported regular-expression aliases supplied by users still produce a warning.

The regression fixture in [`test/main.test.ts`](../../../packages/plugins/event-map-generator/test/main.test.ts) includes both Vite internal aliases and the normal `@dota` string alias. The assertion confirms that only the usable string alias reaches the AST scanner.

This change preserves diagnostic value for user configuration while eliminating noise caused by Vite's internal resolved configuration.

## Step 9: Preserve `dota-wrap`'s custom packaging model

[`dota-wrap`](../../../packages/libs/dota-wrap/) is not a normal single-entry library build. Its [`scripts/build.mjs`](../../../packages/libs/dota-wrap/scripts/build.mjs) invokes Vite programmatically for:

- the root package entry;
- `core`;
- `event`;
- `event-map-generator`;
- `router`;
- `rest`;
- `preloader-plugin`;
- `web-type-json`.

The script distinguishes stateful browser runtime packages from build-time plugins:

- runtime subpaths externalize internal Dota packages so consumers resolve one shared core/event instance;
- build-time plugin subpaths bundle their scanner implementation so the packed wrapper contains the implementation it was built with.

The programmatic Vite configuration received the same Vite 8 settings as file-based configs:

- explicit Oxc legacy decorators;
- the preserved browser target;
- `rolldownOptions`;
- `import.meta`-safe paths.

### Why `dota-wrap` does not use `bundleTypes`

The wrapper emits declarations for its own entrypoints, then replaces each public subpath declaration with the already-built declaration bundle from the owning sibling package. It also rewrites selected internal imports so the copied declarations point at wrapper subpaths.

This avoids asking API Extractor to rebundle the entire multi-package wrapper graph, a path that previously reached API Extractor limitations. Consequently:

- sibling packages bundle their own public declaration surfaces;
- `dota-wrap` copies those stable files;
- `dota-wrap` does not directly enable `bundleTypes`;
- `dota-wrap` does not directly declare API Extractor.

The obsolete `bundledPackages` option was removed from the wrapper's `vite-plugin-dts` configuration because the wrapper now relies on explicit post-build declaration assembly.

## Step 10: Integrate the remote migration branch

The remote migration branch contained 13 commits that were not yet present locally:

| Commit | Change |
| --- | --- |
| `202403a` | Added Vite and Vitest configuration for `dota-core` |
| `511747a` | Added the detailed Vite 8 package audit |
| `881eaa3` | Converted core/rest tests from Jest APIs to Vitest APIs |
| `b372bd0` | Updated generated `dota-web` event-map declarations |
| `3ddeead` | Updated generated `dota-md` event-map comments |
| `7c835d9` | Updated generated `dota-ui` event-map comments |
| `09490c3` | Completed the remaining host-listener test conversion |
| `7c356ed` | Removed core/rest Jest configuration files |
| `7228b24` | Migrated core/rest/router scripts and TypeScript test configuration to Vite/Vitest |
| `1c9369a` | Removed the `dota-core` tsup configuration |
| `2278063` | Removed Jest and tsup resolutions from the committed lockfile |
| `d633f06` | Added Vite and Vitest configuration for `dota-rest` |
| `67e435f` | Modernized router Vite and Vitest configuration |

### 10.1 Simulate before mutating the worktree

Because the working tree already held a large dependency/Vite change, mergeability was checked before updating the branch. The uncommitted tracked changes were represented as a temporary stash commit and compared with the remote branch through `git merge-tree`.

The simulation identified four content conflicts:

```text
package.json
packages/libs/dota-router/vite.config.ts
packages/libs/dota-router/vitest.config.ts
pnpm-lock.yaml
```

All other tracked overlaps merged automatically. The dependency report was untracked and did not collide with a remote path.

### 10.2 Preserve, fast-forward, and reapply

The worktree, including untracked files, was saved as:

```text
stash@{0}: wip-before-remote-branch-update
```

The local branch was then fast-forwarded from `a5950b6` to `67e435f`. No merge commit was created. The saved work was reapplied, producing the same four conflicts predicted by the simulation.

### 10.3 Resolve the four conflicts

The conflict policy was:

- keep the complete catalog-based dependency set in the root manifest;
- retain the remote router cleanup while applying the Vite 8 Oxc, target, Rolldown, and declaration settings;
- keep the router test aliases on the remote `node:path`/`resolve` form while adding Oxc compatibility;
- regenerate `pnpm-lock.yaml` from the resolved manifests instead of hand-merging generated YAML.

After resolution, all changes were left unstaged to preserve the working-tree style that existed before the branch update. The safety stash was retained as a recovery point.

## Step 11: Detect the post-update declaration regression

Textual conflict resolution was not treated as proof of a valid integration.

The first complete test run after the branch update passed all 1,062 tests. The first complete build progressed through the libraries, utilities, plugins, UI packages, and wrapper, then failed in `dota-web`.

The errors consistently reported missing exports from wrapper subpaths, for example:

```text
Module "@ayu-sh-kr/dota-wrap/core" has no exported member "BaseElement".
Module "@ayu-sh-kr/dota-wrap/core" has no exported member "Component".
Module "@ayu-sh-kr/dota-wrap/rest" has no exported member "RestClient".
```

Inspection of the generated wrapper declarations showed why:

```ts
export * from './src/index.js'
export {}
```

The wrapper build copied only `dota-core/dist/index.d.ts` and `dota-rest/dist/index.d.ts`. Those files had become thin re-export shims and depended on declaration trees under `dist/src/`, which the wrapper did not copy.

### Root cause

The remote commits added `dota-core` and `dota-rest` Vite configurations after the initial Vite 8 working-tree migration had been prepared. Those new configs still used the Vite 7-era declaration option:

```ts
rollupTypes: true
```

Under `vite-plugin-dts` 5, the supported option is `bundleTypes`. The obsolete option was ignored, so the two packages emitted declaration trees instead of self-contained public bundles. This was a cross-branch integration problem: each line of work was internally plausible, but their combination broke `dota-wrap`'s declaration-copy contract.

## Step 12: Repair core/rest and reconcile the dependency graph

The repair completed the Vite 8 migration for `dota-core` and `dota-rest`:

1. renamed `rollupTypes` to `bundleTypes`;
2. added direct API Extractor dependencies;
3. added direct Vite, Vitest, declaration plugin, coverage, DOM environment, Node type, and TypeScript dependencies;
4. added explicit Oxc legacy decorator configuration;
5. preserved the Vite 7 browser target;
6. changed core externalization to `rolldownOptions`;
7. replaced `__dirname` with `import.meta.dirname`;
8. renamed their Vite and Vitest configs to `.mts` to remove native-loader ESM warnings;
9. regenerated the root lockfile;
10. rebuilt core and rest before rebuilding the wrapper and `dota-web`.

Once the remote branch's Jest-to-Vitest and tsup-to-Vite migration was incorporated, the old dependencies were no longer used. The following packages were removed from child manifests, the root manifest, the catalog, and the lockfile:

```text
@types/jest
jest
jest-environment-jsdom
ts-jest
tsup
ts-node
```

`ts-node` was removed after a repository-wide search found no remaining invocation. The completed catalog therefore decreased from the intermediate 36-entry graph to the final 30-entry graph.

## Step 13: Validate the combined state

Validation was performed at several levels so one successful command could not hide a broken package boundary.

### 13.1 Dependency and lockfile validation

```bash
pnpm install --lockfile-only
pnpm install --frozen-lockfile
```

Results:

- all 14 workspace projects resolved from the root;
- the lockfile matched the manifests;
- no package-local lockfile remained;
- pnpm's supply-chain policy check passed;
- the frozen install completed without changing the lockfile.

### 13.2 Manifest and configuration scans

Repository scans verified:

- no child manifest contains an external version range;
- internal Dota dependencies use `workspace:*`;
- every `bundleTypes` consumer directly declares API Extractor;
- no Vite/Vitest configuration contains `rollupOptions`, `rollupTypes`, or `__dirname`;
- no active manifest or Vite/Vitest config retains Jest, tsup, or ts-node;
- the catalog contains exactly 30 external version entries.

### 13.3 Test validation

The full workspace command was:

```bash
pnpm test
```

The final result was 1,062 passing tests across the packages that define test scripts:

| Package | Passing tests |
| --- | ---: |
| `dota-common-utils` | 1 |
| `dota-event` | 181 |
| `dota-rest` | 26 |
| `dota-ast-utils` | 148 |
| `event-map-generator` | 42 |
| `dota-core` | 365 |
| `dota-router` | 116 |
| `web-type-json` | 83 |
| `dota-vite-preloader` | 4 |
| `dota-ui` | 94 |
| `dota-wrap` | 2 |
| **Total** | **1,062** |

After the `.mts` config rename, focused core/rest test runs passed again with 365 and 26 tests respectively and without the native config-loader warning.

### 13.4 Build validation

The complete workspace command was:

```bash
pnpm build
```

All 13 package builds passed under Vite `8.2.0`. The important dependency chain was also exercised explicitly in order:

```text
dota-core ─┐
           ├─> dota-wrap ─> dota-web
dota-rest ─┘
```

That focused sequence proved that core/rest declarations were self-contained, the wrapper could copy them, and the application could type-check against the wrapper's public subpaths.

### 13.5 Git integration validation

The final Git checks established that:

- `HEAD` equals `origin/migration/vite-tailwind` at `67e435f`;
- the branch is 15 commits ahead of `origin/master` and zero behind;
- there are no unmerged paths;
- `git diff --check` reports no whitespace errors;
- the working-tree migration remains uncommitted and unpushed;
- `stash@{0}` remains available as the pre-update recovery snapshot.

## Step 14: Complete the TypeScript 6 compiler-only follow-up

After the Vite 8 workspace was stable, TypeScript was migrated separately from `5.9.3` to `6.0.3`.

The follow-up changed:

- the single TypeScript version in the pnpm catalog;
- six package and fixture configs that used the deprecated `baseUrl` option;
- `dota-router` from old Node 10 module resolution to bundler resolution;
- `dota-rest` to explicitly load Node global types;
- the obsolete root `tsconfig.json`, which was removed because no package or root script used it and it could not represent the packages' different local aliases.

The follow-up deliberately preserved:

- every legacy decorator compiler flag;
- every Vite and Vitest `oxc.decorator.legacy: true` setting;
- `emitDecoratorMetadata` and `reflect-metadata` behavior;
- Vite `8.2.0`, Vitest `4.1.10`, `vite-plugin-dts` `5.0.3`, and API Extractor `7.58.9`;
- the catalog-based dependency ownership model.

Validation completed with:

- a frozen pnpm install;
- TypeScript `6.0.3` as the direct workspace compiler;
- all 15 remaining TypeScript configurations passing;
- all 13 workspace builds passing;
- all 1,062 tests passing;
- successful `Sanitizer` imports from both `@ayu-sh-kr/dota-core` and `@ayu-sh-kr/dota-wrap/core` against the generated declarations.

The detailed before/after reasoning and acceptance evidence are in the [TypeScript 6 migration audit with legacy decorators preserved](./typescript-6-legacy-decorator-migration-audit.md).

## Current package behavior

The final build graph has three declaration/output patterns.

### Standard bundled libraries, utilities, UI packages, and plugins

Eleven packages use Vite library mode, `vite-plugin-dts`, `bundleTypes`, and API Extractor. They publish self-contained public declaration entrypoints.

### The `dota-web` application

The application consumes the wrapper's runtime and build plugins, preserves legacy decorator transforms, and targets the explicit browser baseline. It produces application assets rather than declaration bundles.

### The `dota-wrap` aggregator

The wrapper runs multiple programmatic Vite builds and assembles its declarations from sibling bundles. This exception is intentional and is required to preserve its public subpath layout without rebundling the complete declaration graph.

## Known non-blocking output

The final commands pass, but they still report existing informational or warning output that was not part of this migration:

- Browserslist reports that its `caniuse-lite` data is stale.
- `dota-ui` can print Happy DOM abort messages during environment teardown even though all tests pass.
- the event-map and web-type generators warn about mixed default and named exports in CommonJS output.
- `dota-web` reports a broad Tailwind content pattern and a large output chunk.
- Vite reports plugin timing information for the application build.

These warnings do not invalidate the dependency graph or Vite 8 migration. They should be addressed as separate, reviewable changes rather than folded into this toolchain update.

## Recovery and rollback boundaries

The work was kept recoverable throughout the branch update:

- `master` was not modified;
- the migration branch update was a fast-forward, not a history rewrite;
- the pre-update worktree was saved with untracked files;
- the retained `stash@{0}` can be inspected before it is eventually removed;
- the current migration changes are still uncommitted, so their final commit structure can be chosen during review.

If the Vite 8 work must be separated from later TypeScript work, the boundary is explicit: keep TypeScript at `5.9.3`, keep `oxc.decorator.legacy: true`, and do not apply the decorator-plan phases. The build-tool migration is independently validated in that compatibility mode.

## Maintainer checklist for future updates

When changing this toolchain again:

1. update external versions only in [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml);
2. keep root `catalog:` entries synchronized with the complete external dependency set;
3. add a dependency to each child package that directly imports or invokes it;
4. use `workspace:*` for internal Dota packages;
5. keep peer ranges in named catalogs when they intentionally differ from installed versions;
6. regenerate the root lockfile and never add package-local lockfiles;
7. verify declaration output whenever changing TypeScript, `vite-plugin-dts`, or API Extractor;
8. build `dota-core` and `dota-rest` before validating `dota-wrap` and `dota-web`;
9. run the full test and build commands, not only package-local checks;
10. keep TypeScript/decorator migration decisions separate unless the change explicitly owns them.

## Related documentation

- [Workspace dependency audit](../dependencies/workspace-dependency-audit.md)
- [Vite 8 plugin, library, and utility migration audit](./vite-8-plugin-migration-audit.md)
- [TypeScript 6 migration audit with legacy decorators preserved](./typescript-6-legacy-decorator-migration-audit.md)
- [TypeScript 6 and Vite 8 decorator migration plan](./typescript-6-vite-8-decorator-migration-plan.md)
- [SSR/SSG base support migration](./ssr-ssg-base-support-migration.md)
