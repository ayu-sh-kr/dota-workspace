# Function-call payload type resolution

> Status: implemented. This document records the design and acceptance criteria;
> see [current payload resolution behavior](../matching/payload-type-resolution.md)
> for the maintained contract.

This plan defined syntax-only payload recovery for event data that is produced by a
function call. It targets the current `blog:pagination:changed` case in
[blog-pagination.component.ts](../../../../../packages/apps/dota-web/src/components/blogs/blog-pagination.component.ts),
where the publisher receives `persistedState` from a function whose return type
is explicitly `BlogPaginationState`.

## Context and intent

Before this implementation, the event-map generator resolved an identifier payload when the
identifier had an explicit local annotation. It did not follow a call
initializer, so this source was emitted as `unknown`:

~~~ts
export const persistBlogPaginationState = (...): BlogPaginationState => {
  return normalizedState;
};

const persistedState = persistBlogPaginationState(state, totalItems);
publisher.publish({
  name: BLOG_PAGINATION_CHANGE_EVENT,
  data: persistedState,
});
~~~

The implementation must remain syntax-only. It may read explicit TypeScript
annotations and follow statically named local declarations, but it must not
execute functions, evaluate arguments, create a TypeScript Program, or infer
arbitrary control-flow results.

## Desired output

The generated declaration should contain:

~~~ts
import type { BlogPaginationState } from "./components/blogs/blog-pagination.component.ts";

// ...
"blog:pagination:changed": BlogPaginationState;
~~~

The existing payload merge rules remain unchanged: a complete publisher payload
overrides incomplete `unknown` or decorator-only observations, and conflicting
complete payloads still fail generation.

## Supported resolution contract

### Explicit local type

Keep the existing behavior and add regression coverage for:

~~~ts
const state: BlogPaginationState = createState();
publisher.publish({name: EVENT, data: state});
~~~

The local annotation is authoritative even when the initializer is a call.

### Explicit function return type

Resolve return annotations for these statically named, same-module forms:

~~~ts
function createState(): BlogPaginationState { /* ... */ }
const createState = (): BlogPaginationState => ({ /* ... */ });
const createState = function (): BlogPaginationState { /* ... */ };
~~~

The exact return type text should be preserved through `TypeAnnotationUtils`,
including unions, generics, qualified names, and imported type references.

Support both direct and identifier-mediated calls:

~~~ts
publisher.publish({name: EVENT, data: createState()});

const state = createState();
publisher.publish({name: EVENT, data: state});
~~~

### Safe fallbacks

Return `unknown` when the callee is computed, dynamic, unresolved, package
provided, generic without a concrete annotation, or has no explicit return
annotation. Preserve the current behavior for arbitrary expressions, factory
chains, concatenation, environment values, and runtime lookups.

Relative imported functions and re-export chains may be added after the same-file
contract is stable. They must use the existing parsed-module boundary and never
cause the scanner to crawl outside configured scan roots.

## Implementation design

### 1. Extend the generic expression resolver

Update
[ExpressionTypeUtils.ts](../../../../../packages/utils/dota-ast-utils/src/utils/ExpressionTypeUtils.ts):

- add an optional `resolveCall` callback to
  `ExpressionTypeResolutionOptions`;
- route `CallExpression` through that callback;
- return the existing incomplete `unknown` result when no callback resolves it;
- keep call arguments opaque because their values are not needed to read an
  explicit return annotation.

This keeps AST branching in `dota-ast-utils` while leaving declaration ownership
and type-import policy in the event-map scanner.

### 2. Index explicit callable return annotations

Extend the scanner's `ModuleTypeContext` with a named callable-return contract.
Collect only declarations whose callee name is syntactically stable:

- top-level `FunctionDeclaration` identifiers;
- top-level const bindings initialized by `ArrowFunctionExpression`;
- top-level const bindings initialized by `FunctionExpression`.

For each declaration, retain its name, source position, and `TypeAnnotationInfo`
when a return annotation exists. Use `TypeAnnotationUtils.read` against the
original module text so the generated declaration preserves author-written type
syntax.

Class methods, computed method names, overload implementation inference, and
anonymous inline callbacks are out of scope for the first implementation.

### 3. Resolve direct calls and call-backed identifiers

Add a scanner-local call resolver that:

1. accepts only an identifier callee in the first implementation;
2. selects the nearest same-module callable declaration by source position;
3. returns its explicit annotation as `ExpressionTypeInfo` with referenced names;
4. returns `null` when the declaration or annotation is unavailable.

Update `resolveReferenceType` so an unannotated identifier can use its initializer
when that initializer is a supported call expression. Explicit local annotations
must win before call-backed lookup.

Pass the call resolver to `ExpressionTypeUtils.resolve` from `resolvePayloadType`
so both `data: createState()` and `data: state` are covered.

### 4. Preserve type imports

Feed return-annotation references through the existing `createPayloadType`
pipeline. For the blog case, `BlogPaginationState` is exported by the source
module, so the existing exported-type import collection and output-path rebasing
should produce the generated declaration import.

If a referenced type cannot be mapped to an existing source/package import, keep
the current text and completeness policy rather than guessing an import path.

### 5. Keep module indexing boundaries explicit

The reusable AST module utilities remain responsible for AST shape handling,
while `EventMapScanner.ts` owns payload-specific context and type import policy.
Do not add runtime imports, checker calls, Vite hooks, or repository-wide module
crawling. The existing two-phase read/parse/index/scan workflow remains intact.

## Test plan

### AST utility tests

Update `ExpressionTypeUtils` tests for:

- a call resolver returning a complete type;
- a call without a resolver returning incomplete `unknown`;
- call arguments not being evaluated or passed to the resolver;
- existing literal, object, array, and wrapper behavior remaining unchanged.

### Event-map scanner tests

Add fixture-backed cases for:

- direct call with an explicit arrow-function return type;
- identifier initialized from an explicitly typed call;
- function declaration with an explicit return type;
- function expression with an explicit return type;
- explicit local annotation taking precedence over a call result;
- unannotated function return remaining `unknown`;
- computed, dynamic, unresolved, and package-provided calls being skipped or
  rendered as incomplete `unknown`;
- return types with imported and locally exported type names;
- the exact `BLOG_PAGINATION_CHANGE_EVENT` declaration and import output.

Keep existing scanner discovery/read/parse failure tests and payload merge tests.
Use source fixtures rather than runtime mocks for syntax resolution; mock tests
should continue to verify dependency failure propagation and skipped work at the
scanner boundary.

## Acceptance criteria

- `blog:pagination:changed` is emitted as `BlogPaginationState`, not `unknown`.
- The generated declaration contains a correct type-only import for that type.
- Explicit local annotations and return annotations are deterministic and
  source-position aware.
- Unsupported or ambiguous calls remain safe incomplete results.
- No TypeScript checker, runtime execution, or new Vite lifecycle hook is added.
- `dota-ast-utils` and `event-map-generator` focused tests plus regular package
  tests pass.

## Related documentation

- [Identifier-based event-name resolution](./identifier-event-name-resolution.md)
- [Event-map generator overview](../architecture/overview.md)
- [ExpressionTypeUtils](../../../../../packages/utils/dota-ast-utils/src/utils/ExpressionTypeUtils.ts)
- [EventMapScanner](../../../../../packages/plugins/event-map-generator/src/scan/EventMapScanner.ts)
