# Workspace dependency audit

Audit date: 2026-08-03

This report records the dependency baseline before centralizing workspace versions and migrating the build tool to Vite 8. It covers the root manifest, all 13 manifests under `packages/`, the pnpm workspace configuration, lockfiles, package scripts, and imports from Vite, Vitest, Jest, and build configuration files.

## Baseline

| Concern | Audited state |
| --- | --- |
| Workspace projects | 14: the root plus 13 projects under `packages/` |
| Declared dependency names | 49: 38 external packages and 11 internal Dota packages |
| Root dependency coverage | The root declares 21 of the 38 external packages used by the workspace |
| Version ownership | Versions are repeated across the root and child manifests; no pnpm catalog exists |
| Internal dependencies | Internal Dota packages consistently use `workspace:*` |
| Lockfiles | Three lockfiles exist: the root lockfile plus package-local lockfiles in `dota-web` and `dota-ui` |
| Package manager pin | The root manifest has no `packageManager` field |
| Non-deterministic ranges | `markdown-it` uses `latest` in two projects |
| Conflicting declarations | Vite appears as `7.3.1`, `^7.3.1`, and peer range `^7.1.0`; `reflect-metadata` appears as `^0.2.2` and peer range `>=0.2.0` |

The 17 external dependencies used by child projects but absent from the root manifest are:

`@floating-ui/dom`, `@tailwindcss/typography`, `@types/markdown-it`, `ajv`, `autoprefixer`, `consola`, `custom-elements-manifest`, `fast-glob`, `highlight.js`, `jiti`, `markdown-it`, `markdown-it-anchor`, `markdown-it-highlightjs`, `markdown-it-toc-done-right`, `postcss`, `reflect-metadata`, and `tailwindcss`.

## Direct-dependency gaps

Root installation currently masks missing package-level declarations:

- Six projects have a `vite.config.ts` but no direct development dependency on Vite: `dota-event`, `dota-router`, `dota-md`, `dota-ui`, `dota-ast-utils`, and `dota-common-utils`.
- Nine projects import `vite-plugin-dts` without declaring it: `dota-event`, `dota-router`, all three standalone Vite plugins, `dota-md`, `dota-ui`, `dota-ast-utils`, and `dota-common-utils`.
- Nine projects have Vitest configuration or tests without declaring Vitest: `dota-event`, `dota-router`, `dota-wrap`, all three standalone Vite plugins, `dota-ui`, `dota-ast-utils`, and `dota-common-utils`.
- TypeScript, test environments, coverage tooling, Jest tooling, and `tsup` are also supplied transitively from the root rather than declared by each project that invokes them.

These gaps make filtered installs and standalone package builds depend on pnpm's root layout instead of the package manifests.

## Update policy

The dependency graph will use these rules:

1. `pnpm-workspace.yaml` is the single source of truth for external dependency versions through pnpm catalogs.
2. The root manifest references every external workspace dependency through `catalog:` so one root install contains the complete toolchain and dependency set.
3. Child manifests continue to declare their direct runtime, peer, and development dependencies, but external dependencies use `catalog:` instead of local version ranges.
4. Internal Dota packages continue to use `workspace:*`.
5. Peer contracts use named catalogs where their compatibility range intentionally differs from the installed tool version.
6. The root `pnpm-lock.yaml` is authoritative; package-local lockfiles are removed.
7. The root pins pnpm through `packageManager` so contributors and CI resolve the same catalog and lockfile semantics.

## Vite 8 migration boundary

The build-tool update will move the installed toolchain to Vite 8 and update Vite-related plugins whose peer ranges exclude Vite 8. It will also replace deprecated `build.rollupOptions` configuration with `build.rolldownOptions` and preserve an explicit build target.

TypeScript remains on 5.9.3. TypeScript configuration, decorator semantics, decorator metadata, and the TypeScript 6/7 work described in the broader migration plan are explicitly outside this change.

## Acceptance checks

- Every external dependency declaration resolves through a root catalog.
- Every package directly declares the tools and libraries it imports or invokes.
- No child manifest contains an external version string.
- Only the root lockfile remains.
- A frozen install succeeds from the root lockfile.
- All package tests and builds pass under Vite 8 without changing the TypeScript version.

## Update result

Completed on 2026-08-03:

- The root catalog now owns all 30 external dependency versions used across the workspace; child manifests contain only `catalog:` references for external packages and `workspace:*` references for internal packages.
- Every project now declares the build and test tools it directly invokes, including Vite, Vitest, declaration generation, TypeScript, and their required environments. The completed `dota-core` and `dota-rest` migration also removes their obsolete Jest and `tsup` dependencies.
- Vite resolves to 8.2.0, Vitest and `@vitest/coverage-v8` to 4.1.10, `vite-plugin-dts` to 5.0.3, and API Extractor to 7.58.9.
- TypeScript remains unchanged at 5.9.3, and Oxc is explicitly configured to preserve the current legacy decorator runtime.
- All Vite builds use `rolldownOptions`, retain the previous Vite 7 browser baseline explicitly, and use Vite 8-compatible configuration syntax.
- Vite 8's internal RegExp aliases are ignored by the event-map generator because they cannot resolve application source imports; unsupported user RegExp aliases still produce a diagnostic.
- The two package-local lockfiles were removed, pnpm is pinned to 11.9.0, and the root lockfile is authoritative.

Validation completed with a frozen install, a clean peer-dependency check, 1,062 passing tests, the focused event-map generator regression suite, and successful builds for all 13 workspace projects.

## Related documentation

- [Workspace dependency and Vite 8 migration execution record](../migration/workspace-dependency-and-vite-8-migration-execution.md) — detailed implementation chronology, branch integration, declaration regression, repair, and validation evidence.
- [Vite 8 plugin, library, and utility migration audit](../migration/vite-8-plugin-migration-audit.md) — package-by-package compatibility analysis performed before implementation.
