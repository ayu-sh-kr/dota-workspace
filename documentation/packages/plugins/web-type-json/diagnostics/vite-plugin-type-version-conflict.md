# Vite plugin type version conflict

The `TS2769` errors in `dota-web/vite.config.ts` were caused by separate Vite package identities participating in one plugin configuration. The preloader and Web Types plugins were initially typed by Vite 7.3.1, while the app's `defineConfig` resolved from Vite 7.1.11.

## What the errors meant

Both errors had the same cause. One pointed at `dotaVitePreloader(...)` and the other at `dotaWebTypeJson(...)` because both return Vite `Plugin` objects through `@ayu-sh-kr/dota-wrap`.

Vite's `Plugin` and `PluginOption` types include environment and plugin-container types with private members. TypeScript therefore cannot treat instances from separate Vite installations as interchangeable, even when their public structures look similar. The long `hotUpdate`, `DevEnvironment`, and `_pluginContextMap` diagnostics were the nested consequences of that type identity mismatch.

This was a type dependency problem, not an invalid plugin hook or a Custom Elements Manifest configuration problem.

## Why it happened

The app did not declare its own Vite development dependency, so its config resolved the workspace-root Vite 7.1.11. The `dota-wrap` build used Vite 7.3.1, and its generated plugin declarations consequently referenced that installation.

After aligning the Vite version, pnpm still produced two Vite 7.3.1 identities because Vite's optional `jiti` peer resolved differently: the app inherited `jiti@1.21.7` through Tailwind while the wrapper resolved `jiti@2.6.1`. pnpm includes peer resolution in a package's identity, so equal Vite versions with different peer contexts still expose unrelated private types.

The app build could still complete because Vite executes the returned plugin objects at runtime, where the TypeScript-only identity conflict does not exist. IDE analysis and an explicit type-check of `vite.config.ts` exposed the incompatible declarations.

## Fix

- `dota-web` now owns Vite 7.3.1 and its `jiti@2.6.1` peer context directly, matching the declarations consumed from `dota-wrap`.
- The workspace root is pinned to Vite 7.3.1 so workspace-level TypeScript services cannot resolve the former 7.1.11 copy for `defineConfig`.
- `dota-wrap`, `dota-preloader-plugin`, and `dota-web-type-json` declare Vite 7 as a peer dependency because the consuming Vite application owns the runtime.
- `dota-web/tsconfig.json` includes `vite.config.ts`, so the normal package type-check detects future plugin type splits.
- The config continues to use the normal plugin return values. No `as PluginOption`, `any`, or other cast hides version conflicts.

After dependency installation, rebuild the plugin and wrapper packages before checking the app config so generated declarations reflect the current source contracts.

## Verification

Run an explicit config check when isolating this failure:

```sh
pnpm exec tsc --noEmit --skipLibCheck \
  --module ESNext --moduleResolution Bundler --target ES2022 --types node \
  packages/apps/dota-web/vite.config.ts
```

Then run the normal app build:

```sh
pnpm --filter dota-web build
```

## Related files

- [`dota-web/vite.config.ts`](../../../../../packages/apps/dota-web/vite.config.ts)
- [`dota-web/package.json`](../../../../../packages/apps/dota-web/package.json)
- [`dota-wrap/package.json`](../../../../../packages/libs/dota-wrap/package.json)
- [`dota-preloader-plugin/package.json`](../../../../../packages/plugins/dota-vite-preloader/package.json)
- [`dota-web-type-json/package.json`](../../../../../packages/plugins/web-type-json/package.json)
- [Custom Elements Manifest integration](../custom-elements/custom-elements-manifest-integration.md)
