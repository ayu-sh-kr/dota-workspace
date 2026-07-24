# Identifier event-name resolution upgrade

This document is the implementation plan for extending identifier-based event
name resolution in `event-map-generator`. It is intentionally separate from
the current behavior description in
[identifier-event-name-resolution.md](./identifier-event-name-resolution.md):
that document describes the narrow contract that exists today, while this one
defines the next compatible contract.

The current behavior is illustrated in the
[identifier resolution flow diagram](../matching/identifier-event-name-resolution-flow.svg).
The important boundary shown there is that `AstModuleResolver` can only follow
modules already in its index and currently resolves only relative TypeScript
imports. The generator does not pass Vite's alias configuration into that
resolver.

## Outcome to target

Given this Vite configuration:

~~~ts
resolve: {
  alias: {
    '@dota': resolve(projectRoot, 'src'),
  },
}
~~~

and this source:

~~~ts
import {BLOG_INDEX_DATA_EVENT} from '@dota/configs/blog-events.ts';

@OnEvent(BLOG_INDEX_DATA_EVENT)
onBlogData(event: ApplicationEvent<typeof BLOG_INDEX_DATA_EVENT>): void {}
~~~

the generator should resolve the imported constant when the target file is in
the configured scan set, and should produce the same event key as a relative
import. It must remain syntax-only: no application code may be executed and no
TypeScript type checker or runtime module loader is required.

The compatibility rule is simple:

- With no resolver configuration, existing relative-import behavior remains.
- An alias is only useful when its target resolves to a file in the parsed
  module index.
- Unsupported, ambiguous, dynamic, cyclic, or out-of-scope references are
  skipped and reported at the generator boundary; an identifier is never
  emitted as though it were the event key.

## Findings from the current implementation

### Immediate alias limitation

`packages/apps/dota-web/vite.config.ts` defines `@dota`, but the plugin call
does not pass `resolve.alias`. In `packages/plugins/event-map-generator/src/main.ts`,
`configResolved()` only captures `config.root`. In
`packages/utils/dota-ast-utils/src/utils/AstModuleResolver.ts`,
`resolveImportPath()` accepts only specifiers beginning with `.`.

This means all of the following stop before the target module is considered:

~~~ts
import {BLOG_INDEX_DATA_EVENT} from '@dota/configs/blog-events.ts';
import {BLOG_INDEX_DATA_EVENT} from '@shared/blog-events';
import {BLOG_INDEX_DATA_EVENT} from 'src/configs/blog-events';
~~~

The local import alias syntax (`import {EVENT as LOCAL_EVENT}`) is already a
different feature and is supported for relative targets. The missing feature is
module-specifier alias mapping, not the `as` keyword on an import binding.

### Other resolver limitations

The current resolver is deliberately narrow, but the limitations now affect
real source layouts and should be made explicit before extending it:

| Limitation | Current effect | Upgrade implication |
| --- | --- | --- |
| Vite aliases are not passed to the resolver | Aliased event modules resolve to `null` | Capture and normalize aliases in the generator; keep path mapping generic in `dota-ast-utils` |
| Only exact `.ts` and `index.ts` candidates are tried | `.tsx`, `.mts`, `.cts`, and some explicit extensions fail | Make extension candidates configurable and keep discovery/parser policy in the generator |
| Only named imports are indexed | Default and namespace import forms cannot be followed | Add generic import binding kinds; support only statically provable forms |
| Wildcard exports are ignored | `export * from './events'` breaks an otherwise valid chain | Add lazy or indexed wildcard export traversal with cycle guards |
| Default exports are not modeled | `import EVENTS from './events'` cannot resolve members | Add a deliberate default-export contract, not broad object evaluation |
| Static member access is limited | Computed, optional, nested, and namespace members fail | Support only bounded, statically named member paths |
| `satisfies` is not transparent | `EVENT satisfies string` fails | Treat `TsSatisfiesExpression` like other type-only wrappers |
| Static templates and concatenation are not evaluated | `` `blog:${'index'}:data` `` and `'blog:' + 'index'` fail | Add a small constant-expression evaluator with hard safety limits |
| Binding lookup is position-based, not scope-aware | A local shadow can incorrectly select a module constant | Index lexical scopes or reject ambiguous shadowed references |
| No resolution trace or reason code exists | Missing alias, missing file, cycle, and dynamic value are indistinguishable | Return structured diagnostics internally while preserving a simple compatibility API |
| Module keys use normalized paths but not real paths | Symlinked or duplicate paths can create two logical modules | Normalize paths consistently and define symlink/duplicate handling |
| Aliases are not constrained by target roots | A future alias implementation could scan unintended files | Require target paths to be indexed and validate ownership against scan roots |
| Watchers only react to `.ts` and do not add external roots | A change outside the app root can leave generated output stale | Watch all configured source roots and accepted extensions, with rebuild coalescing |

The event-specific naming policy, candidate extraction, payload inference,
location collection, built-in registry, declaration generation, and Vite
lifecycle should remain generator concerns. They should not be generalized into
the AST utility merely because they happen to call the resolver.

## Ownership split

The central design rule is: `dota-ast-utils` proves syntax and module identity;
`event-map-generator` decides which proven values count as events and when to
scan or regenerate.

| Capability | Move to or add in `dota-ast-utils` | Add or retain in `event-map-generator` |
| --- | --- | --- |
| Module-specifier mapping | Generic alias/path-mapping input, independent of Vite types | Convert Vite aliases and explicit plugin options into the generic input |
| Relative resolution | Candidate extensions, `index` lookup, normalized absolute paths | Choose scan globs/parser syntax and supply the indexed module set |
| Alias resolution | Exact-prefix and wildcard path substitution, deterministic file probing | Validate aliases against project/scan-root policy and report rejected mappings |
| Import bindings | Named, default, namespace metadata where statically resolvable | No event-specific import rules |
| Export graph | Local exports, aliased re-exports, wildcard re-exports, default-export metadata, cycles | Decide whether a resolved declaration is eligible for event discovery |
| Binding semantics | Scope-aware declarations, references, shadowing, declaration positions | No duplicate lexical binding logic in scanner code |
| Expression evaluation | String literals, type-only wrappers, bounded static templates/concatenation, static member paths | Request a value for `@OnEvent` and publication `name` expressions |
| Safety controls | Cycle, recursion-depth, expression-size, and output-length guards | Configure limits appropriate for event names and turn failures into useful logs |
| Diagnostics | Structured result and generic reason codes/trace steps | Add source location, event-site context, warning policy, and debug logging |
| Event naming | No `EVENT`/`Event` convention | `EventNamePolicy.isEventConstantName()` remains here |
| Source scanning | No fast-glob or Vite watcher lifecycle | Discover roots, parse files, deduplicate modules, scan decorators/calls |
| Payload inference | No event payload policy | Keep `ApplicationEvent<T>`/publisher payload recovery here |
| Artifact generation | No declaration or location output | Merge candidates, built-ins, payloads, locations, and write artifacts |
| Rebuild lifecycle | No server integration | Capture Vite config, watch roots/aliases, coalesce rebuilds, reload client |

Do not make `dota-ast-utils` depend on Vite. The utility should accept a small
plain data model, for example:

~~~ts
export type AstPathAlias = {
  find: string;
  replacement: string;
  kind: 'exact' | 'prefix';
};

export type AstModuleResolutionOptions = {
  aliases?: AstPathAlias[];
  extensions?: string[];
  conditions?: string[];
  allowOutsideIndex?: boolean;
};
~~~

The exact public names can change during implementation. The important part is
that the AST package receives normalized strings and does not import `vite`,
read Vite config files, or know about event-map generation.

## Proposed resolver contract

Keep the existing `AstModuleResolver.resolve(...): string | null` as a small
compatibility wrapper. Add a richer method for the generator and future AST
consumers:

~~~ts
const result = AstModuleResolver.resolveWithTrace(expression, module, index, {
  aliases,
  extensions,
});

if (result.value != null) {
  // A proven event string.
}

result.reason; // e.g. 'module-not-indexed', 'dynamic-expression', 'cycle'
result.trace;  // import/export/binding steps for diagnostics
~~~

Suggested reason categories are:

- `resolved`;
- `unsupported-expression` or `dynamic-expression`;
- `binding-not-found` or `binding-shadowed`;
- `module-specifier-unmapped`;
- `module-not-found` or `module-not-indexed`;
- `export-not-found`;
- `ambiguous-module`;
- `cycle` or `resolution-limit`.

The result should distinguish “not proven” from “proven to be an empty
string”; an empty string is still a valid statically known string and should be
returned as a value. A trace should be optional or cheap to omit so normal
scans do not allocate unnecessary diagnostic data.

### Alias matching rules

Implement alias resolution as deterministic path mapping:

1. Normalize configured replacement paths relative to the Vite project root.
2. Sort aliases by longest matching `find` prefix, then by declaration order.
3. Support exact aliases (`@events` → one file/directory) and prefix aliases
   (`@dota` → `src`, so `@dota/config.ts` maps to `src/config.ts`).
4. Support a normalized wildcard form when a `*` mapping comes from
   `tsconfig.paths`.
5. Probe only the configured extension list and `index` candidates.
6. Require the resolved file to exist in the parsed module index unless an
   explicit future mode opts into resolver-driven file loading.
7. Detect multiple indexed matches and return `ambiguous-module` rather than
   selecting by filesystem order.

Vite also supports regular-expression aliases. Do not silently approximate
those with string prefix matching. Initially, classify unsupported regex aliases
as a warning and require an explicit normalized resolver adapter if a project
needs one.

### Expression scope and safety rules

The resolver should remain a static proof tool, not a partial JavaScript
interpreter. The next safe set is:

- `StringLiteral`;
- `ParenthesisExpression`, `TsAsExpression`, `TsConstAssertion`,
  `TsNonNullExpression`, and `TsSatisfiesExpression` wrappers;
- `Identifier` references to eligible, scope-correct `const` bindings;
- non-computed static member paths such as `Events.BLOG_INDEX_DATA_EVENT`;
- templates whose quasis and interpolations are each statically resolvable;
- optionally, `+` where every operand is a proven string and the configured
  length limit is not exceeded.

Do not evaluate function calls, environment variables, object lookups,
arbitrary enum lowering, mutation, or runtime imports. If support for a new
expression would require executing code or TypeScript type checking, it belongs
outside this resolver contract.

Scope-aware lookup must account for function parameters, local variables,
nested blocks, and import bindings. At minimum, a reference must not fall back
to a module-level event constant when a closer unsupported binding shadows the
same name. A conservative `binding-shadowed` result is safer than a wrong event
map entry.

## Generator integration plan

### Configuration model

Extend `EventMapGeneratorPluginConfig` with explicit resolver configuration for
standalone scanner use, while allowing the Vite plugin to populate it:

~~~ts
type EventMapGeneratorPluginConfig = {
  // existing fields...
  resolver?: {
    aliases?: AstPathAlias[];
    extensions?: string[];
    maxDepth?: number;
    maxValueLength?: number;
  };
};
~~~

In `configResolved(config)`, normalize:

- `config.root` and the effective plugin root;
- `config.resolve.alias` string entries;
- explicit `options.resolver.aliases`, with an intentional precedence rule;
- optional `tsconfig.compilerOptions.paths` only if the plugin is explicitly
  configured to read it.

Do not make the scanner infer aliases from `process.cwd()` or from an unrelated
package's `tsconfig`. The source of truth must be the resolved Vite config or
explicit plugin options.

Pass the normalized resolver options through:

~~~text
Vite config
  → event-map plugin normalization
  → scanEventMapSources(..., resolverOptions)
  → AstModuleResolver.createIndex(..., resolverOptions)
  → resolveWithTrace(...)
~~~

The direct `scanEventMapSources` API should accept the same plain resolver
options so tests can exercise aliases without constructing a Vite server.

### Scan roots and index boundaries

The generator currently scans `./src/**/*.ts` beneath each configured root and
deduplicates the resulting absolute paths. Upgrade this boundary to:

- define accepted extensions in one scanner option;
- include every configured scan root in the parsed index;
- normalize and deduplicate paths before indexing;
- ensure alias targets are inside a configured scan root, unless an explicit
  opt-in says otherwise;
- never crawl arbitrary package sources just because an import is bare;
- preserve deterministic file ordering and candidate ordering.

This matters for `dota-web`, which scans its own source plus `dota-ui` and
`dota-md`. An alias can point to any of those roots, but a successful resolution
must still be backed by a parsed module in the same scan operation.

The existing `resolve('./src')` alias in the Vite configs should also be
reviewed and made explicitly relative to `projectRoot` (`resolve(projectRoot,
'src')`) so alias normalization does not inherit the process working directory.
That is a configuration correctness fix, separate from AST resolution.

### Diagnostics

The generator should log unresolved event-site references only at a useful
verbosity, with:

- source file and event expression location;
- original module specifier, when relevant;
- resolver reason;
- a short trace in debug mode;
- a suggestion when an alias is missing or outside the scan roots.

Do not warn for every intentionally dynamic expression by default; aggregate or
deduplicate warnings per source expression and keep normal builds readable.

### Watcher lifecycle

Alias support changes the set of files that can affect the generated map. The
plugin should:

- watch all configured scan roots and accepted source extensions;
- add alias replacement directories that are within the scan boundary;
- ignore generated declaration/location outputs and declaration files;
- coalesce bursts of add/change/unlink events into one regeneration;
- use the same normalized root filtering in build and dev-server paths;
- invalidate the module index by rescanning the complete configured set, which
  is simpler and safer than trying to patch graph edges incrementally.

These are generator lifecycle responsibilities. `AstModuleResolver` should not
know about Vite's watcher or websocket reload behavior.

## Implementation phases

### Phase 0 — lock the contract

1. Keep the current relative-import regression tests green, including the blog
   constants used by `@OnEvent`, `publish`, and `publishAsync`.
2. Add a failing generator-level fixture that imports the same four blog event
   constants through `@dota/...`.
3. Decide the alias precedence, accepted extensions, regex-alias behavior, and
   scan-root boundary before changing the public config.
4. Record deterministic ordering and unresolved-value behavior as assertions.

### Phase 1 — generic path resolution in `dota-ast-utils`

1. Add normalized alias/path-mapping types to `packages/utils/dota-ast-utils/src/Types.ts`.
2. Extract import-specifier-to-module-path logic from
   `AstModuleResolver` into a testable utility or resolver strategy.
3. Add exact/prefix/wildcard mapping, extension candidates, index files,
   ambiguity detection, and normalized path handling.
4. Pass path-resolution options into `createIndex`/`resolve` without importing
   Vite.
5. Add unit tests for relative, exact alias, prefix alias, wildcard alias,
   extension/index candidates, missing targets, ambiguous targets, and cycles.

### Phase 2 — strengthen the generic AST model

1. Add `TsSatisfiesExpression` unwrapping.
2. Add scope-aware binding indexing and conservative shadow handling.
3. Add the selected default/namespace/wildcard-export forms with explicit
   static-member limits.
4. Add bounded static template and, if approved, string-concatenation support.
5. Add `resolveWithTrace` and reason codes while retaining `resolve` as a
   compatibility wrapper.
6. Add tests for every supported form and for every “return null” safety case.

### Phase 3 — integrate the generator with Vite

1. Extend plugin/scanner options with normalized resolver options.
2. Convert `ResolvedConfig.resolve.alias` in `configResolved`.
3. Merge explicit aliases according to the Phase 0 precedence rule.
4. Pass options into the AST index and resolution calls.
5. Add the aliased blog fixture and verify both decorator and async-publisher
   observations, including payload inference.
6. Add diagnostics tests so missing aliases and out-of-scope targets are
   explainable without changing generated output.

### Phase 4 — lifecycle and source-shape coverage

1. Add supported extension scanning and parser syntax selection if `.tsx`,
   `.mts`, or `.cts` are accepted.
2. Register/watch external scan roots and safe alias target directories.
3. Coalesce watcher rebuilds and prevent generated-output feedback loops.
4. Verify build-start and dev-server behavior with the same alias fixture.
5. Add determinism tests across repeated scans and different filesystem order.

### Phase 5 — package and documentation release

1. Build and validate `dota-ast-utils` first.
2. Build the event-map generator against the updated utility.
3. Rebuild/republish the wrapper entry point consumed by applications:
   `@ayu-sh-kr/dota-wrap/event-map-generator`.
4. Update the architecture overview so it no longer describes payload
   inference as entirely future work.
5. Link this plan from the current resolution contract and document the final
   supported alias forms in the package README or feature documentation.
6. Add a changeset when the public package configuration or generated behavior
   is released.

## Test matrix

The minimum regression matrix should include these cases in both the AST utility
unit suite and the generator integration suite where applicable:

| Case | Expected result |
| --- | --- |
| Relative named import | Existing event key remains resolved |
| Exact alias to file | Event key resolves |
| Prefix alias to directory | Event key resolves |
| `tsconfig.paths` wildcard | Event key resolves when explicitly configured |
| Alias to `index.ts` | Event key resolves |
| Alias to another configured scan root | Event key and payload resolve |
| Aliased re-export chain | Event key resolves through every indexed module |
| Missing alias target | Candidate is skipped with `module-not-found`/`module-not-indexed` |
| Target outside scan roots | Candidate is skipped or rejected by explicit policy |
| Ambiguous alias target | Candidate is skipped with `ambiguous-module` |
| Regex Vite alias | Warning and skip unless an adapter is configured |
| Alias cycle | Candidate is skipped with `cycle` |
| Local shadowing of event constant | Conservative skip; never use the wrong outer constant |
| `satisfies`, assertions, parentheses, non-null | Same literal event key |
| Static template/approved concatenation | Resolves only when every part is static |
| Function call, environment lookup, dynamic template | Skipped as unresolved |
| Static class member and imported class member | Resolves when non-computed and indexed |
| Wildcard/default/namespace form | Resolves only for the explicitly supported subset |
| Repeated scan and reordered files | Same sorted output and locations |
| Watcher change in scan root | One regenerated artifact and reload |

## Definition of done

The upgrade is complete when:

- the four blog event constants resolve through the `@dota` alias in a real
  generator/Vite integration test;
- relative imports still pass without any resolver configuration;
- alias mappings are represented by Vite-independent AST utility types;
- unsupported expressions and paths remain safe, deterministic, and explainable;
- scope, export, cycle, and ambiguity behavior is covered by tests;
- watcher changes in configured external roots regenerate the map;
- the wrapper package exports the upgraded implementation;
- current architecture and feature documentation describe the shipped behavior;
- the current SVG remains a readable description of the pre-upgrade flow, while
  a future-state diagram is added only if the upgraded graph becomes materially
  different.
