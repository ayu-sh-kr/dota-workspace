---
name: plugin-build-watcher
description: Wire the Vite plugin lifecycle for a Dota scanning plugin — the hook taxonomy, apply/enforce, resolveId/load for virtual modules, buildStart for the eager build, this.addWatchFile for build-time dependency tracking, configureServer/handleHotUpdate for the dev watcher, plugin-scope caching and invalidation, watcher-event filtering, metadata-change diffing to avoid needless reloads, and coalesced refresh for artifact writers. Use when connecting scanning and generation to Vite, or debugging dev-server refresh and HMR behavior.
---

# Plugin Build & Watcher

Connect the pure scan (`plugin-source-scanning`) and generation
(`plugin-artifact-generation`) functions to Vite's build and dev lifecycle. This
is the only layer that holds mutable state, touches `server`, and reads the
clock. Keep it thin — it orchestrates; it does not parse or serialize.

## Hook taxonomy — pick the right hook

| Hook | Kind | Use it for |
| --- | --- | --- |
| `config` / `configResolved` | Vite | Read/adjust config; capture `root`, `command`, `mode`. Never `process.cwd()`. |
| `buildStart` | Rollup (universal) | Eager full scan (+ generate for writers); warm caches. |
| `resolveId` / `load` | Rollup (universal) | Serve virtual modules. |
| `transform` | Rollup (universal) | Rewrite individual module source; call `this.addWatchFile` for deps. |
| `buildEnd` | Rollup (universal) | Final emit/cleanup for the build path. |
| `configureServer` | Vite | Subscribe to `server.watcher`; register custom middleware. |
| `handleHotUpdate` | Vite | The idiomatic HMR entry point — inspect the changed module, scope the update, or trigger a reload. |

**`apply` / `enforce`.** Set `apply: 'serve'` for watcher-only concerns or
`apply: 'build'` for emit-only ones when a plugin isn't needed in both; set
`enforce: 'pre'`/`'post'` only when ordering against other plugins matters. Omit
both otherwise.

Two lifecycle shapes follow, matching the two output modes.

## Shape A — virtual modules (serve on demand)

The plugin answers imports for a synthetic module. Reference:
`packages/plugins/dota-vite-preloader/src/main.ts`.

### Virtual IDs

Keep both IDs in `Constants.ts`. The resolved ID is the public ID prefixed with
`\0` (Vite's convention marking an internal/resolved virtual module):

```ts
export class VirtualImportID {
  static DOTA_COMPONENTS = "virtual:dota-components";
  static RESOLVED_DOTA_COMPONENTS = "\0virtual:dota-components";
}
```

### resolveId + load

```ts
resolveId(id) {
  if (id === VirtualImportID.DOTA_COMPONENTS) return VirtualImportID.RESOLVED_DOTA_COMPONENTS;
  return null;
},
async load(id) {
  if (id === VirtualImportID.RESOLVED_DOTA_COMPONENTS) {
    const candidates = await ensureCandidatesLoaded();   // cached scan
    return await resolveComponentExport(candidates);      // generation fn
  }
  return null;
},
```

`resolveId` maps public → resolved and returns `null` for everything else.
`load` matches the resolved ID and returns generated source. Both must be inert
for unrelated IDs.

### Track scanned files as build dependencies

In build, the virtual module depends on every scanned file. Register them with
`this.addWatchFile` (from `load`/`buildStart`) so Rollup's watch mode re-runs
when a scanned source changes, even though those files are not in the module's
static import graph:

```ts
async load(id) {
  if (id !== VirtualImportID.RESOLVED_DOTA_COMPONENTS) return null;
  const candidates = await ensureCandidatesLoaded();
  for (const c of candidates) this.addWatchFile(resolve(root, c.filePath));
  return await resolveComponentExport(candidates);
}
```

## Shape B — written artifacts (regenerate on change)

The plugin writes files during build and refreshes them on watcher events.
Reference: `packages/plugins/web-type-json/src/main.ts`. Wrap scan + write in one
coordinator so build and watcher share exactly one code path:

```ts
const generateArtifacts = async (): Promise<WebComponentInfo[]> => {
  const infos = await scanWebComponents(root, scanRoots);
  await writeGeneratedArtifacts({ root, outFile, scannedWebComponentInfos: infos, customElementsManifest });
  return infos;
};
```

## buildStart — the eager path

Run a full scan (and, for Shape B, generate) once at build start, and warm the
cache:

```ts
async buildStart() {
  cachedCandidates = await scanDotaComponents(root, logger);       // Shape A: warm cache
  // or:  await generateArtifacts();                               // Shape B: emit files
}
```

## Plugin-scope caching

Declare caches inside the factory closure so every hook shares them. Load lazily
and reuse:

```ts
let cachedCandidates: DotaComponentCandidate[] | null = null;

async function ensureCandidatesLoaded() {
  if (!cachedCandidates) cachedCandidates = await scanDotaComponents(root, logger);
  return cachedCandidates;
}
```

Derived caches (route candidates, an event index) depend on the base cache;
invalidate them together.

## configureServer — the dev watcher

Subscribe to `server.watcher` for `add`, `change`, and `unlink`. **Filter first**
so unrelated files are ignored cheaply:

```ts
configureServer(server) {
  server.watcher.on('add', file => {
    if (!isScannableFile(file, root)) return;   // signal-specific predicate
    /* refresh */
  });
  // change, unlink likewise
}
```

Use the plugin's own scannability predicate — `ComponentUtils.isComponentFile`
(preloader) or `ComponentSourceUtils.isScannableComponentFile` (web-type-json)
today; an event plugin supplies its own. All confirm the path is under `src/`,
match the plugin's file suffixes, and reject paths escaping the root. If a plugin
scans files **outside** the Vite root (a shared external directory), add them
explicitly with `server.watcher.add(path)` — the watcher only covers the root by
default.

### Shape A — invalidate the virtual module

Clear the caches, invalidate the resolved module in the graph, and trigger a
reload:

```ts
function invalidateVirtualModule(server: ViteDevServer) {
  const mod = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_COMPONENTS);
  if (mod) server.moduleGraph.invalidateModule(mod);
  server.ws.send({ type: 'full-reload' });
}
```

On the next import Vite re-invokes `load`, which rescans through
`ensureCandidatesLoaded`.

### Diff metadata to avoid needless reloads

On `change`, only force a reload when **registration metadata** actually changed
(class name, selector, route path, event key/payload). Let Vite's normal HMR
handle implementation-only edits — reloading on every keystroke is the common
performance bug here:

```ts
server.watcher.on('change', async (file) => {
  if (!isScannableFile(file, root)) return;
  const relPath = relative(root, file).replace(/\\/g, '/');
  const prev = cachedCandidates?.filter(c => c.filePath === relPath) ?? [];

  let code: string, ast: Module;
  try { code = await readFile(file, 'utf-8'); } catch { return reloadVirtualModule(file, 'read error'); }
  try { ast = await parse(code, { syntax: 'typescript', decorators: true }); }
  catch { return reloadVirtualModule(file, 'parse error'); }

  const next = extractComponentCandidatesFromAst(ast);
  if (isComponentMetadataChanged(prev, next)) reloadVirtualModule(file, 'changed');
  // else: let Vite HMR handle the implementation-only change
});
```

`isComponentMetadataChanged` / `isRouteMetadataChanged` compare length then
per-index identity fields only. Write the equivalent diff for your signal (for an
event map: the event key and payload type, not the handler body). On read/parse
failure, fall back to a safe reload rather than trusting stale metadata.

### handleHotUpdate — the idiomatic alternative

For finer control, `handleHotUpdate({ file, server, modules })` is the Vite-native
place to decide an update's fate: filter by `file`, run the same metadata diff,
and either return `[]` to swallow the event, return a narrowed module list, or
call the invalidation above and return. Prefer it over raw `watcher.on('change')`
when you want to *scope* HMR rather than always full-reload.

### Shape B — coalesce concurrent refreshes

Editors fire bursts of events. Share one in-flight promise so overlapping events
don't queue duplicate scans, and clear it in `finally` so failures don't wedge
the watcher:

```ts
let pendingRefresh: Promise<void> | null = null;
const refresh = async (): Promise<void> => {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = generateArtifacts()
    .then(infos => log.debug("Scanned:", infos))
    .finally(() => { pendingRefresh = null; });
  return pendingRefresh;
};

for (const event of ["add", "change", "unlink"] as const) {
  server.watcher.on(event, async file => {
    if (!isScannableFile(file, scanRoots)) return;
    await refresh();
  });
}
```

## Best practices

- **Resolve `root` in `configResolved`**, accept an option override, never
  `process.cwd()`.
- **One coordinator** shared by build and watcher; do not duplicate the
  scan→generate sequence per hook.
- **Filter before work** in every watcher handler.
- **Diff metadata; defer implementation edits to HMR.** Prefer `handleHotUpdate`
  to scope updates instead of always full-reloading.
- **Fail soft:** read/parse errors trigger a safe reload, never an uncaught throw.
- **Caches live in factory scope** and invalidate with their derivatives.

## Validate

Build exercises `buildStart` + `resolveId`/`load`; the dev server exercises the
watcher. Check both:

```bash
pnpm --filter @ayu-sh-kr/<plugin-name> build
pnpm --filter @ayu-sh-kr/<plugin-name> test
```

Tests should mock `fast-glob` and drive the exported pure functions and the
factory directly (see `web-type-json/test/web-types.test.ts`), rather than
booting a real Vite server. Manually verify a dev-server edit: a metadata change
reloads, an implementation-only edit does not.

## Review checklist

- Is each concern on the right hook, with `apply`/`enforce` set only when needed?
- Do `resolveId`/`load` map only the plugin's own IDs and return `null` otherwise?
- Is the resolved virtual ID `\0`-prefixed and sourced from `Constants.ts`?
- Are scanned files registered via `this.addWatchFile` (build) and, if outside
  root, `server.watcher.add` (dev)?
- Are caches declared in factory scope and invalidated together with derivatives?
- Does every watcher handler filter the path before doing work?
- Does `change` diff metadata and defer implementation-only edits to HMR (via
  diff or `handleHotUpdate`)?
- Are read/parse failures handled with a safe reload, never an uncaught throw?
- Do concurrent artifact refreshes share one coalesced, self-clearing promise?
