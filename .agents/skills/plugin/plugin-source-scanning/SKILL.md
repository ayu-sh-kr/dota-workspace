---
name: plugin-source-scanning
description: Scan Dota source into structured metadata inside a Vite plugin, for any signal — class decorators (@Component/@Route), member decorators (@Property/@OnEvent), or call sites (publish/emit). Covers fast-glob discovery, one-pass @swc/core parsing, syntactic traversal with @ayu-sh-kr/dota-ast-utils fluent queries and Views, extending that fluent API when it lacks a traversal, argument/type extraction, deterministic ordering, and safe failure handling. Use when writing or reviewing the scanning half of any plugin.
---

# Plugin Source Scanning

Turn source files into a plain metadata array — no side effects, no output. This
is the pure, testable core every plugin shares. Codegen belongs to
`plugin-artifact-generation`; lifecycle to `plugin-build-watcher`.

**Golden rule: syntactic only.** Never invoke the TypeScript type checker,
`ts-morph`, or a TS `Program`. Read decorator arguments, call arguments, and type
*annotation* nodes directly from the SWC AST. This is what makes scanning fast
and what the whole plugin family relies on.

## Scan the signal, not "the component"

The reference plugins scan components, but that is one instance of a general
job. A plugin scans for one or more **signals**, and the signal determines how
you locate and extract it:

| Signal kind | Example | Where it lives | How you locate it |
| --- | --- | --- | --- |
| Class decorator | `@Component({selector})`, `@Route({path})` | on exported classes | fluent declaration query → `getClassDeclarations()` |
| Member decorator | `@Property({...})`, `@OnEvent('key')` | on class fields/methods | class-member query → filter members with the decorator |
| Call site | `publish({name, data})`, `emit(...)` | expression statements inside method bodies | expression traversal → filter calls by callee name |

Component generation uses the first two. **Event generation
(`event-map-auto-generation-plugin.md`) needs the second and third** — the event
*key* comes from an `@OnEvent('key')` method decorator or a `name:` string in a
`publish(...)` argument object, and the *payload* from that argument's `data`
type annotation. When you build a new plugin, first name its signals, then map
each to the table above. Do not assume "scan = find classes."

## The scan pipeline

Four steps, regardless of signal. References: `web-type-json/src/main.ts`
(`scanWebComponents`) and `dota-vite-preloader/src/domain/*.domain.ts`.

### 1. Discover with fast-glob

```ts
import fg from "fast-glob";
import { ComponentScanPath } from "@dota/Constants.ts";

const files = await fg([
  ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
  ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
  ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH,
], { cwd: root, absolute: false });
```

- `absolute: false` when the path becomes a relative import in codegen
  (preloader); `absolute: true` when you need the real path for ownership checks
  and dedupe (web-type-json).
- Multiple roots: glob each, then dedupe and sort —
  `[...new Set(discovered.flat())].sort((a, b) => a.localeCompare(b))`.
- **Read files concurrently** but parse each once; independent file reads are the
  natural parallelism boundary. Never re-glob per signal.

### 2. Read and parse once per file

```ts
import { readFile } from "node:fs/promises";
import { parse, type Module } from "@swc/core";

const code = await readFile(file, "utf-8");
const ast: Module = await parse(code, { syntax: "typescript", decorators: true });
```

`decorators: true` is mandatory. Parse each file exactly once and reuse the `ast`
and raw `code` for every extractor (offsets and expression-printing need the
original text).

### 3. Traverse with dota-ast-utils (fluent-API first)

Use the fluent query API and `*View` wrappers; do not hand-walk raw SWC nodes in
the plugin. Entry points (all from `@ayu-sh-kr/dota-ast-utils`):

- `DeclarationUtils.queryOf(ast)` → fluent query over the module. Chain
  `.getExportDeclarations().getClassDeclarations()`,
  `.getExportNamedDeclarations().filterLocalExports().getNamedSpecifiers()`, etc.
  Terminate with `.toArray()`; narrow with `.filter(...)`.
- `ClassDeclarationQuery` descends into members: `getClassMethods()`,
  `getClassProperties()`, `getDecorators()`, `getConstructors()`, and more — this
  is how you reach **member decorators**.

`*View` wrappers read a single node without `.type` discrimination:

| View | `.from(node)` gives you | Key methods |
| --- | --- | --- |
| `DecoratorView` | a `Decorator` | `getName()`, `getArguments()` |
| `ObjectExpressionView` | an `ObjectExpression` | `getProperty(name)`, `toObject()` |
| `KeyValuePropertyView` | a `KeyValueProperty` | `getString()`, `getBoolean()` |
| `PropertyView` | class fields | `extractProperties(classDecl)`, `hasDecorator(name)`, `getDecorator(name)`, `propertyName()`, `getType()`, `isRequired()`, `defaultValue()`, `getSourceOffset(...)` |
| `ClassView` | a `ClassDeclaration` | `getSourceOffset(code, ast.span.start, moduleOffset)` |

The full query contract is in
`packages/utils/dota-ast-utils/src/query/contracts/DeclarationFluentQuery.ts`.
`ASTHelperUtils` in the preloader is a **legacy local fallback** — do not extend
it. New traversal capability goes into the shared fluent library (next section).

### 4. Extract, guard at every level, return metadata

Find the signal, require its argument shape, pull the keyed value, require the
identity — guard-and-skip at each step, never throw:

```ts
const decorator = DecoratorUtils.extractDecorators(classDecl)
  .find(d => DecoratorUtils.decoratorName(d) === ASTFilterConstants.COMPONENT_DECORATOR_NAME);
if (!decorator) continue;

const args = DecoratorView.from(decorator).getArguments();
if (args[0]?.expression.type !== "ObjectExpression") continue;

const config = ObjectExpressionView.from(args[0].expression).toObject();
const selector = config["selector"];
if (typeof selector !== "string") continue;   // skip, never throw
```

For decorated members, filter then `flatMap` so invalid entries drop out cleanly
(see the `@Property` extraction in `web-type-json/src/main.ts`). Model each
record as a **named type** (`DotaComponentCandidate`, `WebComponentInfo`,
`PropertyInfo`) in `Types.ts`, not an anonymous shape. Keep both an HTML
attribute name and a JS field name when they can differ.

## Extending the fluent API (do this instead of hacking around it)

`dota-ast-utils` is meant to grow so each new plugin is faster to write. When a
traversal you need is missing, **add it to the fluent library**, consistent with
the existing API — never fork the logic into a plugin-local helper.

How to add a capability:

1. Find the closest contract in
   `packages/utils/dota-ast-utils/src/query/contracts/` and its impl in
   `query/impl/`, or the closest `*View` in `view/`.
2. Add a method in one of the two established shapes:
   - **Selector** — narrows and returns a query of the same or a child node type
     (`filterX(): ThisQuery`, `getX(): SomeQuery`), mirroring `getClassDeclarations`,
     `filterLocalExports`, `getClassMethods`.
   - **Terminal** — returns `DeclarationTerminalQuery<Node>` for a flattened node
     list, mirroring `getDecorators`, `getNamedSpecifiers`.
   - Or a **View** — `.from(node)` plus focused readers that return normalized
     primitives or `undefined` and never throw, mirroring `KeyValuePropertyView`.
3. Document it with JSDoc and an `@example` showing the source → node mapping,
   exactly like the existing methods.
4. Add tests in the mirrored test tree and export from the barrel
   (`query/index.ts`, `view/index.ts`, `main.ts`).

Known gaps worth upstreaming (needed by event-style scanning), all expressible in
the current fluent style:

- **Call-expression discovery.** A query to select `CallExpression` nodes inside
  method/function bodies, filterable by callee name — e.g.
  `ClassMethodQuery.getCallExpressions()` → terminal query, plus a
  `filterByCallee('publish')`. This is what finds `publish(...)`/`emit(...)`.
- **Method-decorator access.** Reaching `@OnEvent('key')` on a `ClassMethod`
  ergonomically — ensure member decorators are reachable from the class-member
  query and readable via `DecoratorView`.
- **Direct string-literal argument read.** A `DecoratorView.getStringArgument(i)`
  convenience so `@OnEvent('key')` does not require the object-expression path.
- **`CallExpressionView`** — `.getCalleeName()`, `.getArgumentObject()` — to read
  a call the way `DecoratorView` reads a decorator.

If you must shim locally to unblock a release, isolate the shim in its own module,
comment it as temporary, and open a follow-up to move it into the fluent API.

## Resolving type and default without a checker

- **Type:** read the member's own `TsTypeAnnotation` via `PropertyView.getType()`,
  or an explicit `type` in the decorator/argument config; fall back to a coarse
  categorical name inferred from a literal initializer. Normalize with a
  `normalizePropertyType` policy (`ComponentMetadataUtils`). For event payloads,
  the same technique reads the `data` property's annotation.
- **Default:** `ComponentMetadataUtils.defaultValueFromExpression(...)` serializes
  only simple literals and returns `undefined` for complex expressions — never
  guess a runtime value.
- **Preserve an expression verbatim** (a route `render` factory): print the AST
  node back to source with SWC `printSync` wrapped in a synthetic `Script`, then
  trim the trailing `;` (see `printExpressionSource` in `route-candidate.domain.ts`).

## Source offsets (for IDE navigation)

When output needs source navigation (Web Types/CEM), translate spans carefully —
SWC anchors module spans at the first token:

- `ComponentSourceUtils.findModuleSourceOffset(code)` skips leading
  whitespace/comments to the true first-token index.
- `ClassView`/`PropertyView` `getSourceOffset(...)` return corrected offsets.
- `ComponentSourceUtils.toWebTypesSourceFile(root, file)` makes the path
  package-relative with a `./` prefix and forward slashes.

Skip offsets entirely for plugins whose output does not need navigation (the
preloader does not).

## Best practices

- **Name the signals first.** Decide what AST shapes you scan before writing
  traversal, and put every name/key/glob in `Constants.ts`.
- **One parse per file, reads in parallel, no re-globbing per signal.**
- **Guard-and-skip everywhere**; wrap `readFile`/`parse` in try/catch, log at
  `error`, and `continue`.
- **Sort before returning** by visible identity first, breaking ties on source
  location (see `sortWebComponentInfos`), so output is byte-stable.
- **Keep the scanner free** of `writeFile`, Vite hooks, and any checker call.
- **Grow the fluent API** rather than the plugin's local helpers.

## Review checklist

- Are the plugin's signals named explicitly, and mapped to class/member/call-site
  extraction?
- Is every file parsed once with `decorators: true`, reads parallelized?
- Does traversal use `dota-ast-utils` queries/views, with any gap filled by a new
  fluent method (not a local hack or `ASTHelperUtils` extension)?
- Are all names/keys/globs sourced from `Constants.ts`?
- Does every extractor guard-and-skip instead of throwing?
- Is the returned metadata a named type, deterministically sorted?
- Is the scanner free of file writes, Vite hooks, and type-checker calls?
