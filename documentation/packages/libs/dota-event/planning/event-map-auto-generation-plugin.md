# Auto-generating `ApplicationEventMap`

This document specifies how to auto-generate the per-package `event-map.d.ts`
files that currently back `@ayu-sh-kr/dota-event`'s `ApplicationEventMap`. It is
an implementation plan; generation is not implemented yet — today every
`event-map.d.ts` is written and kept in sync by hand.

## Context and intent

`ApplicationEventMap` (`packages/libs/dota-event/src/Types.ts:28`) is an empty
interface meant to be declaration-merged per consumer:

```ts
declare module '@ayu-sh-kr/dota-wrap/event' {
  interface ApplicationEventMap {
    'docs:theme-change': { theme: string };
  }
}
```

Every bus/listener/publisher overload in `dota-event` (`EventChannel.ts`,
`DefaultApplicationEventBus.ts`, `DefaultApplicationEventListener.ts`,
`DefaultApplicationEventPublisher.ts`, `DefaultApplicationEventManager.ts`)
keys its strongly-typed overload off `keyof ApplicationEventMap`. Three
`event-map.d.ts` files exist today and are all hand-maintained:

- `packages/ui/dota-md/src/event-map.d.ts` — augments `@ayu-sh-kr/dota-event`
  directly, 3 keys (`md:theme-change`, `md:color-change`, `md:render`).
- `packages/apps/dota-web/src/event-map.d.ts` — augments
  `@ayu-sh-kr/dota-wrap/event` (dota-web depends on the `dota-wrap` meta-package,
  not `dota-event` directly), ~8 keys.
- `packages/libs/dota-event/test/event-map.d.ts` — test fixture, out of scope
  for generation.

The two production event names actually enter the system at exactly two kinds
of call sites, both already scanned today by the sibling
`@ayu-sh-kr/dota-web-type-json` plugin for a *different* concern (component
properties, not events):

1. **Subscription** — the `@OnEvent(name)` method decorator
   (`packages/libs/dota-event/src/listener/on-event.decorator.ts`), e.g.
   `theme-picker.component.ts:37` — `@OnEvent('docs:theme-change')`.
2. **Emission** — `publish(...)` / `publishAsync(...)` / `emit(...)` calls
   whose argument is an `ApplicationEvent` object literal, e.g.
   `theme-picker.component.ts:50` —
   `.publishAsync({ name: 'docs:theme-change', data: { theme } })`.

Both currently type-check only because a human already added
`'docs:theme-change': { theme: string }` to `event-map.d.ts` by hand. Nothing
fails at compile time if that entry is missing, wrong, or stale — a typo'd
event name or a changed payload shape silently degrades to the untyped
`AnyEventKey` fallback in `EventKey`/`ApplicationEvent`. That silent fallback,
not a build error, is the actual problem this plan removes.

## Required behavior

The generator must produce the same shape of file a developer writes today —
a `declare module '<target>' { interface ApplicationEventMap { ... } }`
block — from the two call-site kinds above, for one package at a time, and it
must do so the same way `@ayu-sh-kr/dota-web-type-json` does: parsing each
file once with `@swc/core` through `@ayu-sh-kr/dota-ast-utils`, with **no**
type checker (no `ts-morph`, no TypeScript Program). Everything here stays a
syntactic AST scan.

| Concern | Source of truth | Resolution mechanism |
| --- | --- | --- |
| Event **key** (the string literal) | `@OnEvent('key')` first argument, or `name: 'key'` in a `publish`/`publishAsync`/`emit` argument object | Syntactic — a string-literal AST node, exactly like today's `@Property({name: ...})` scan |
| Event **payload type** | The `data` property of the same `publish`/`publishAsync`/`emit` argument object | Syntactic — resolved from explicit type annotations reachable in the same file, the same technique `PropertyView.getType()` already uses for `@Property` fields |

`@ayu-sh-kr/dota-web-type-json` already proves the pattern this plan reuses:
`PropertyView.getType()` (`packages/utils/dota-ast-utils/src/view/PropertyView.ts`)
never asks a checker for a property's type. It reads the property's own
`TsTypeAnnotation` node, or falls back to a coarse categorical name inferred
from a literal initializer (`StringLiteral` → `"string"`,
`ObjectExpression` → `"object"`, etc.). `ComponentMetadataUtils.normalizePropertyType`
then normalizes that categorical name for the schema.

The event-payload case is a direct generalization of the same idea, not a
new category of problem: `data` expressions in this codebase are either
literals, object literals built from local identifiers, or identifiers/casts
whose type is declared a few lines away in the same file. Concretely, in
`theme-picker.component.ts`:

```ts
private publishTheme(theme: ThemeName) {
  ApplicationEventService.getInstance()
    .getPublisher()
    .publishAsync({ name: 'docs:theme-change', data: { theme } });
}
```

`data: { theme }` is an `ObjectExpression` whose one shorthand property
resolves to the identifier `theme` — the parameter of the enclosing method,
explicitly annotated `ThemeName` a few tokens earlier in the same file. No
semantic type inference is needed to recover `{ theme: ThemeName }`; only a
syntactic "find the nearest annotated declaration for this identifier" walk,
which is new to `dota-ast-utils` but built from the same AST-node vocabulary
(`TsTypeAnnotation`, `Identifier`, `Param`, `VariableDeclarator`) `PropertyView`
already understands.

### Key discovery rules

- `@OnEvent('literal')` and `@OnEvent('literal', scoped)` — take the first
  argument when it is a string literal. The `scoped` boolean does not affect
  map membership; scoped and unscoped handlers for the same key are the same
  entry.
- `.on('literal', cb)` / `.off('literal', cb)` direct calls on an
  `ApplicationEventListener`/`ApplicationEventBus` — same rule, as a
  supplementary source when a key is only ever subscribed to directly (no
  decorator) or only ever published without a matching `@OnEvent`.
- `.publish(...)` / `.publishAsync(...)` / `.emit(...)` where the argument is
  an `ObjectExpression` with a string-literal `name` property — read `name`
  for the key and `data` for the payload-type expression.

### Explicit exclusions (do not silently misreport these as generated)

- **Non-literal event names.** `popover.component.ts` uses
  `@OnEvent(LifecycleEventConstants.CONNECTED, true)` — an identifier
  member-expression, not a string literal. The scanner cannot know its runtime
  value without resolving the referenced constant across files. Skip these
  and emit a `logType`-gated diagnostic naming the file and decorator; do not
  attempt cross-file constant folding in v1.
- **`EventChannel`-mediated names.** `EventChannel.on('ready', cb)`
  (`packages/libs/dota-event/src/channel/EventChannel.ts:58`) prefixes the
  literal at runtime (`${this.prefix}:${event}`), so the string seen at the
  call site is never the actual registered key. Treating the pre-prefix
  literal as a map entry would be wrong; treating the post-prefix computed
  string as one is not statically knowable from syntax alone (the prefix can
  itself be a runtime value). Detection stays syntactic too: if the call
  receiver is an identifier or `this.<field>` whose nearest reachable
  declaration is annotated (or constructed) as `EventChannel` — the same
  "find the nearest annotated declaration" walk used for payload types (see
  below) — exclude the call. A receiver whose declared type cannot be
  resolved in the same file is excluded conservatively rather than guessed
  at; document it as a known limitation (see below).
- **Unresolvable payload types.** When the `data` expression is neither a
  literal nor an identifier/cast whose declaration carries an explicit
  `TsTypeAnnotation` reachable in the same file, resolve the property (or the
  whole payload) to `unknown` rather than guessing, and emit a
  `logType`-gated diagnostic pointing at the call site so the author can add
  an explicit annotation upstream. This is the direct cost of staying
  SWC-only instead of using a type checker, and mirrors how
  `PropertyView.getType()` already returns `null`/`"custom"` rather than
  inventing a shape it cannot see.
- **Conflicting payload shapes for the same key.** If two call sites both
  resolve a key to structurally different, non-`unknown` types (e.g. one
  call site's `data` is `{ theme: ThemeName }` and another's is `string`),
  fail the build with both source locations rather than silently picking one
  — mirroring how `createCustomElementsManifest` throws on an output-path
  collision today (`packages/plugins/web-type-json/src/main.ts`, "Cannot
  generate a Custom Elements Manifest for ... sourceFile is missing").
  Structurally identical types merge into one entry; an `unknown` resolution
  at one call site never conflicts with a resolved type at another — the
  resolved type wins and the `unknown` site is just noted in the diagnostic
  log.

## Proposed flow

```text
source files (scanRoots)
        │
        ▼
@swc/core parse (one pass per file, via @ayu-sh-kr/dota-ast-utils)
        │
        ├──► @OnEvent(...) decorator call sites ──► key (+ scoped flag, ignored)
        │
        └──► .publish/.publishAsync/.emit/.on/.off call sites
                     │      (skip when receiver resolves to EventChannel)
                     ├──► name: literal ──► key
                     └──► data: <expr>
                              │
                              ▼
                     ExpressionTypeResolver (dota-ast-utils, syntactic only)
                       ├─ literal              → categorical type ("string", "boolean", ...)
                       ├─ identifier / as-cast  → nearest annotated declaration in file
                       ├─ object expression     → recurse per property → structural type text
                       └─ unresolved            → "unknown" (+ diagnostic)
        │
        ▼
aggregate by key, detect conflicts, sort deterministically
        │
        ▼
declare module '<targetModule>' { interface ApplicationEventMap { ... } }
        │
        ▼
write <outFile> (event-map.d.ts)
```

## Implementation steps

### 1. New package: `@ayu-sh-kr/dota-event-map-json`

Create `packages/plugins/dota-event-map-json`, sibling to
`packages/plugins/web-type-json`, with the same shape (`src/main.ts`,
`src/Types.ts`, `src/Constants.ts`, `src/utils/*`, `vite.config.ts`,
`package.json`, `tsconfig.json`) and the same runtime dependencies:
`@swc/core` (via `@ayu-sh-kr/dota-ast-utils`), `fast-glob`, `consola`. No
type-checking package is added — this plugin stays in the same tier of work
as `web-type-json`, one `@swc/core` parse per file, nothing heavier. Keep it
a separate package from `web-type-json` anyway: it scans a structurally
different site (call expressions across components, services, *and* pages,
not `@Component`/`@Property` decorator configuration), and keeping the scans
independent means neither plugin's watcher/build cost grows with the other's
scope.

### 2. Extend `@ayu-sh-kr/dota-ast-utils` with call-expression and
identifier-resolution views

`dota-ast-utils` (`packages/utils/dota-ast-utils`) currently has no
`CallExpression` view (`grep -rl CallExpression packages/utils/dota-ast-utils/src`
only matches decorator-call handling inside `DecoratorUtils`/`DecoratorView`/
`PropertyView`) and no cross-declaration identifier lookup — `PropertyView.getType()`
only reads a property's *own* `typeAnnotation`, never another node's. Both
are needed here and are useful beyond this plugin, so add them as general
`dota-ast-utils` primitives rather than private helpers inside the new
plugin:

- **`CallExpressionView`** (`src/view/CallExpressionView.ts`), mirroring
  `DecoratorView`'s shape:
  - `static from(node: CallExpression): CallExpressionView`
  - `calleeName(): string | undefined` — resolves `.publish`, `.emit`,
    `.on`, `.off`, etc. from a `MemberExpression` callee (`expr.type ===
    "MemberExpression"` with a `.property` `Identifier`), the same
    resolution style `DecoratorUtils.decoratorName` already uses for
    `Identifier` vs. `CallExpression` decorator forms.
  - `getArguments(): Expression[]`
  - `receiver(): Expression | undefined` — the `MemberExpression.object`,
    used for the `EventChannel` exclusion check.
- **`ExpressionTypeUtils`** (`src/utils/ExpressionTypeUtils.ts`) — lift the
  private `getTypeFromExpression` switch out of `PropertyView` into a shared
  static method (`categoricalTypeOf(expr: Expression): string | null`) so
  both `PropertyView` and the new event scanner categorize
  `StringLiteral`/`BooleanLiteral`/`NumericLiteral`/`ObjectExpression`/etc.
  identically instead of duplicating the switch.
- **`TypeAnnotationUtils`** (`src/utils/TypeAnnotationUtils.ts`) — lift the
  private `getTypeFromTypeAnnotation` switch out of `PropertyView` into a
  shared static method (`textOf(tsType: TsType): string | null`) that works
  on *any* `TsType` node, not just `ClassProperty.typeAnnotation` — needed
  because the event scanner reads annotations off function/method parameters
  and `const` declarators, not only class fields.
- **`DeclarationResolver`** (`src/utils/DeclarationResolver.ts`) — new: given
  an `Identifier` and the enclosing function/method/class body it appears
  in, walk outward through enclosing scopes in the *same source file* to
  find the nearest `Param`, `VariableDeclarator`, or `ClassProperty`/`PrivateProperty`
  with that name, and return its `TsTypeAnnotation` node if present. Also
  unwrap `TsAsExpression`/`TsTypeAssertion` (`expr as ThemeName`) directly at
  the use site before falling back to declaration search — casts are a
  cheaper and equally reliable syntactic signal. This resolver is
  deliberately same-file and annotation-only: it does not cross imports and
  does not widen unannotated inferred types, unlike a full type checker (see
  "Known limitations").

### 3. Scanner: `scanApplicationEvents(root, scanRoots)`

New function in `main.ts`, parallel to `scanWebComponents`, using only
`@swc/core` + the `dota-ast-utils` primitives above:

1. Discover files with `fast-glob`, reusing the same directory conventions as
   `ComponentScanPath` (`packages/plugins/web-type-json/src/Constants.ts`) —
   introduce an `EventScanPath` constant covering `*.component.ts`,
   `*.service.ts`, and `*.page.ts` (event handlers live in services too, e.g.
   `notification.service.ts`, unlike components-only property scanning).
2. For each file, `parse(code, {syntax: "typescript", decorators: true})`
   exactly once — the same single-parse-per-file discipline
   `scanWebComponents` already follows.
3. Walk each class/function body and:
   - Find every `Decorator` named `OnEvent` (`DecoratorUtils.decoratorName`);
     take its first `CallExpression` argument; keep it only if it is a
     `StringLiteral`.
   - Find every `CallExpression` (via the new `CallExpressionView`) whose
     `calleeName()` is `publish`, `publishAsync`, `emit`, `on`, or `off`;
     take the relevant positional argument; keep it only if it is an
     `ObjectExpression` containing a string-literal `name` property (skip
     `on`/`off`'s plain string-literal first argument the same way, without
     requiring an object).
   - Skip any call whose `receiver()` resolves, through `DeclarationResolver`,
     to a declaration annotated (or `new`-constructed) as `EventChannel` —
     see exclusions above. A receiver that cannot be resolved in the same
     file is skipped as well, not assumed safe.
4. For each retained emission call site, resolve the `data` property's
   expression:
   - Literal expression → `ExpressionTypeUtils.categoricalTypeOf`.
   - Identifier or `as`-cast → unwrap the cast if present, otherwise resolve
     through `DeclarationResolver` to the nearest annotated declaration, then
     `TypeAnnotationUtils.textOf`.
   - `ObjectExpression` → recurse per property using the same two rules,
     building a structural type text like `{ theme: ThemeName }`; a property
     that cannot be resolved becomes `unknown` rather than aborting the whole
     entry.
   - Missing `data` property entirely → `null` payload (matching the
     `'app:initialized': null`-style entries already in
     `dota-web/src/event-map.d.ts`).
5. Aggregate into `Map<string, { typeText: string; sources: SourceLocation[] }>`;
   throw a descriptive error (key, both `typeText` values, both source
   locations) on structural mismatch between two non-`unknown` resolutions.
6. Sort keys with `localeCompare` for deterministic output, matching
   `ComponentMetadataUtils.sortWebComponentInfos`'s determinism guarantee.

### 4. Emitter: `createEventMapDeclaration(entries, targetModule)`

Produce the `.d.ts` text directly (no JSON intermediate needed, unlike Web
Types/CEM, since the artifact *is* TypeScript):

```ts
declare module '<targetModule>' {
  interface ApplicationEventMap {
    'key': <typeText>;
  }
}
```

Prepend a single-line generated-file banner (e.g.
`// Generated by @ayu-sh-kr/dota-event-map-json — do not edit by hand.`) so
the file's provenance is unambiguous, the same way generated `custom-elements.json`
is silently understood to be generated because the plugin owns it entirely.
Per-key TSDoc comments that exist in today's hand-written files (e.g. the
`/** Fired when the user picks a different theme variant... */` lines in
`dota-web/src/event-map.d.ts`) are **not** reproduced automatically in v1 —
there is no reliable adjacent-comment source at a `publish()` call site the
way there is at a `@Property` declaration (see
`documentation/packages/plugins/web-type-json/planning/tsdoc-description-extraction.md`
for the analogous, still-unimplemented, decorator-adjacent-TSDoc pattern).
Treat this as a follow-up once the mechanical generation is stable, not a
blocker for v1.

### 5. Config and plugin wiring

Mirror `WebTypeJsonPluginConfig`:

```ts
export type EventMapJsonPluginConfig = {
  root?: string;
  scanRoots?: string[];
  outFile?: string;        // default: "src/event-map.d.ts"
  targetModule: string;    // required — no safe default, e.g. "@ayu-sh-kr/dota-wrap/event"
  logType?: LogType;
};
```

`targetModule` has no default because it is not derivable from `root` alone
— `dota-web` augments `@ayu-sh-kr/dota-wrap/event` while `dota-md` augments
`@ayu-sh-kr/dota-event` directly, purely because of which package each app
depends on for the event bus.

Implement `buildStart` (initial generation) and a coalesced
`configureServer` watcher exactly like `dotaWebTypeJson`
(`packages/plugins/web-type-json/src/main.ts`'s `refresh()`/`pendingRefresh`
pattern), watching `add`/`change`/`unlink` for files under `scanRoots`.

### 6. Distribute through `dota-wrap`, the way `web-type-json` already is

`dota-web` does not depend on `@ayu-sh-kr/dota-web-type-json` directly; it
imports `@ayu-sh-kr/dota-wrap/web-type-json`
(`packages/apps/dota-web/vite.config.ts:5`). Follow the identical pattern for
the new plugin:

1. Add `"@ayu-sh-kr/dota-event-map-json": "workspace:*"` to
   `packages/libs/dota-wrap/package.json` dependencies.
2. Add a subpath export block, copying the `./web-type-json` entry
   (`packages/libs/dota-wrap/package.json:66-72`) with `event-map-json` in
   place of `web-type-json`.
3. Add `src/event-map-json/index.ts` to `dota-wrap`:
   ```ts
   export { default } from '@ayu-sh-kr/dota-event-map-json';
   export * from '@ayu-sh-kr/dota-event-map-json';
   ```
4. In `packages/libs/dota-wrap/scripts/build.mjs`, add `'@ayu-sh-kr/dota-event-map-json'`
   to `internalPackages`, add an `entries` item (`name: 'event-map-json'`,
   `source: 'src/event-map-json/index.ts'`, `outDir: 'dist/event-map-json'`,
   `bundleInternal: true`, `external: nodePluginExternal` — it needs Node
   built-ins and `@swc/core`, the same externals `web-type-json` already
   lists), and a matching `declarationSources['event-map-json']` pointing at
   `../../plugins/dota-event-map-json/dist/index.d.ts`.

### 7. Wire it into `dota-web/vite.config.ts`

Add alongside the existing plugins:

```ts
import dotaEventMapJson from "@ayu-sh-kr/dota-wrap/event-map-json";

// inside plugins: [...]
dotaEventMapJson({
  root: projectRoot,
  scanRoots: [
    projectRoot,
    resolve(projectRoot, '../../ui/dota-ui'),
    resolve(projectRoot, '../../ui/dota-md'),
  ],
  outFile: 'src/event-map.d.ts',
  targetModule: '@ayu-sh-kr/dota-wrap/event',
  logType: 'info',
}),
```

Apply the same pattern independently to `dota-md`'s own `vite.config.ts`
(`targetModule: '@ayu-sh-kr/dota-event'`, no cross-package `scanRoots` needed
since `dota-md`'s events are local to itself today).

## Test plan

### `dota-event-map-json` unit tests

- Key extraction from `@OnEvent('x')` and `@OnEvent('x', true)` (scoped flag
  ignored for map membership).
- Key + payload extraction from `.publish`, `.publishAsync`, and `.emit`
  object-literal arguments, including `data: undefined`/absent → `null`
  payload.
- Direct `.on('x', cb)` / `.off('x', cb)` string-literal argument extraction.
- Non-literal event name (`@OnEvent(SomeConst.VALUE)`) is skipped with a
  diagnostic, not silently included or crashed on.
- Calls on an `EventChannel` receiver are excluded.
- Two call sites with identical resolved payload types for the same key
  merge into one entry.
- Two call sites with structurally different payload types for the same key
  throw, and the error names both source locations.
- Deterministic, sorted, byte-for-byte stable output across unchanged repeated
  runs.
- Generated file emits a valid `declare module` block that `tsc` accepts
  against a fixture package.

### Integration

- Run generation against `packages/apps/dota-web` and diff the result
  against the current hand-written `packages/apps/dota-web/src/event-map.d.ts`
  — every existing key (`app:initialized`, `notification:info/success/danger/warning`,
  `docs:theme-change`, `docs:color-change`, `tools:select`) must reappear with
  an equivalent or more precise type.
- Run generation against `packages/ui/dota-md` and diff against
  `packages/ui/dota-md/src/event-map.d.ts` (`md:theme-change`,
  `md:color-change`, `md:render`).
- Confirm `packages/ui/dota-ui/src/components/popover/popover.component.ts`
  and `packages/ui/dota-ui/src/components/animations/**` (which use
  `LifecycleEventConstants` and no `EventChannel`-external keys) produce zero
  spurious entries.

Run:

```sh
pnpm --filter @ayu-sh-kr/dota-event-map-json test
pnpm --filter @ayu-sh-kr/dota-event-map-json build
pnpm --filter @ayu-sh-kr/dota-wrap build
```

## Acceptance criteria

- Every `key`/payload pair currently hand-written in `dota-web/src/event-map.d.ts`
  and `dota-md/src/event-map.d.ts` is reproduced by the generator with an
  equal-or-more-precise type.
- Non-literal event names and `EventChannel`-mediated names never appear as
  fabricated or incorrect entries; both are logged and skipped.
- Conflicting payload shapes for one key fail generation with both source
  locations, never silently resolve to one guess.
- Regenerating over an unchanged source tree produces byte-identical output.
- The new plugin is distributed through `@ayu-sh-kr/dota-wrap` exactly like
  `@ayu-sh-kr/dota-web-type-json` is today, and wired into `dota-web` and
  `dota-md`'s own `vite.config.ts` files.
- `web-type-json`'s existing scan, output, and watcher behavior are
  unaffected — this is a new, independent plugin and scan pass.

## Known limitations (follow-ups, not blockers)

- **`EventChannel` keys are not generated.** `EventChannel` prefixes are only
  resolvable at runtime in the general case. A future pass could special-case
  channels constructed with a literal `prefix` string and a literal local
  event name, but this plan intentionally excludes it.
- **Non-literal `@OnEvent`/call-site names are not resolved.** Simple
  same-file `const` string resolution (e.g. `const CONNECTED = 'connected'`)
  is a plausible incremental improvement; cross-file constant resolution is
  not.
- **Per-key documentation comments are not generated.** See step 4; this
  mirrors the still-unimplemented TSDoc-extraction plan for Web Types and
  should likely reuse whatever comment-anchoring utility that plan introduces
  in `dota-ast-utils`.
- **Only same-file, explicitly annotated payload shapes resolve precisely.**
  `DeclarationResolver` does not cross imports and does not run type
  inference on unannotated declarations — this is the direct tradeoff of
  staying syntax-only (see "Required behavior"). A `data` value built from an
  unannotated cross-file helper resolves to `unknown` with a diagnostic
  rather than an incorrect guess; tightening this later means adding more
  same-file annotation lookups, not adding a type checker.

## Related files and documentation

- [`dota-event/src/Types.ts`](../../../../../packages/libs/dota-event/src/Types.ts)
- [`dota-event/src/listener/on-event.decorator.ts`](../../../../../packages/libs/dota-event/src/listener/on-event.decorator.ts)
- [`dota-event/src/channel/EventChannel.ts`](../../../../../packages/libs/dota-event/src/channel/EventChannel.ts)
- [`dota-web/src/event-map.d.ts`](../../../../../packages/apps/dota-web/src/event-map.d.ts)
- [`dota-md/src/event-map.d.ts`](../../../../../packages/ui/dota-md/src/event-map.d.ts)
- [`web-type-json/src/main.ts`](../../../../../packages/plugins/web-type-json/src/main.ts)
- [`web-type-json/src/utils/ComponentMetadataUtils.ts`](../../../../../packages/plugins/web-type-json/src/utils/ComponentMetadataUtils.ts)
- [`dota-ast-utils/PropertyView.ts`](../../../../../packages/utils/dota-ast-utils/src/view/PropertyView.ts)
- [`dota-ast-utils/DecoratorUtils.ts`](../../../../../packages/utils/dota-ast-utils/src/utils/DecoratorUtils.ts)
- [`dota-ast-utils/SourceOffsetUtils.ts`](../../../../../packages/utils/dota-ast-utils/src/view/SourceOffsetUtils.ts)
- [`dota-wrap/scripts/build.mjs`](../../../../../packages/libs/dota-wrap/scripts/build.mjs)
- [`dota-wrap/package.json`](../../../../../packages/libs/dota-wrap/package.json)
- [Custom Elements Manifest integration](../../plugins/web-type-json/custom-elements/custom-elements-manifest-integration.md)
- [TSDoc description extraction](../../plugins/web-type-json/planning/tsdoc-description-extraction.md)
