# Event payload type resolution

The event-map generator recovers a declaration-safe TypeScript payload type from
event source expressions. It keeps the generated `ApplicationEventMap` useful
without executing application code or creating a TypeScript checker program.

## Context and intent

The generator scans `publish`, `publishAsync`, and `emit` calls, together with
`@OnEvent` handlers, and writes a module augmentation such as:

```ts
declare module '@ayu-sh-kr/dota-wrap/event' {
  interface ApplicationEventMap {
    'user:updated': UserUpdatedPayload;
  }
}
```

Payload resolution is deliberately syntax-only. The scanner reads explicit
annotations and recognizable AST shapes, but it never evaluates a function,
follows runtime control flow, or asks the TypeScript compiler what an arbitrary
expression means.

## Behavior

The scan begins by discovering `.ts` files under the configured scan roots. It
ignores declaration files, reads and parses each source file once with SWC, and
builds the source context used by payload recovery. That context includes:

- local type annotations on parameters, variables, and class properties;
- explicit return annotations on top-level functions, arrow functions, and
  function expressions;
- source imports and locally exported types, so generated declarations can
  retain type-only imports.

For a publisher call, the scanner reads the `data` property from the first object
argument and passes its expression to `ExpressionTypeUtils`. The resolver maps
these syntax forms as follows:

| Source expression | Generated type behavior |
| --- | --- |
| String, boolean, number, bigint, or `null` literal | Primitive type such as `string`, `number`, or `null` |
| Object literal | Structural object type, recursively resolving its properties |
| Array literal | Array of the resolved element-type union |
| Identifier or non-computed member | Same-module annotation, or a call-backed binding when available |
| `as`, type assertion, or `satisfies` expression | The explicit annotation text |
| Same-module named call with an explicit return type | The callable's return annotation |
| Unsupported or unresolved expression | `unknown`, marked incomplete |

For example:

```ts
type UserUpdatedPayload = {
  id: string;
  changes: Record<string, unknown>;
};

const payload: UserUpdatedPayload = readPayload();

publisher.publish({
  name: USER_UPDATED_EVENT,
  data: payload,
});
```

The generated entry is `UserUpdatedPayload`. The type reference is kept with
its source import information and emitted as a type-only import, rebased when a
relative source path must be expressed from `event-map.d.ts`.

### Function-call payloads

The scanner accepts explicit return annotations on statically named callables in
the same source module:

```ts
function createPayload(): UserUpdatedPayload {
  return readPayload();
}

publisher.publish({
  name: USER_UPDATED_EVENT,
  data: createPayload(),
});
```

The same rule applies to top-level annotated arrow and function expressions. An
unannotated function, a computed callee, a member call, an imported helper call,
or a runtime factory chain remains `unknown` because syntax alone cannot prove
its return type.

### Decorator-only events

An `@OnEvent` decorator establishes event membership, but it does not provide
payload evidence. The scanner intentionally ignores calls inside the handler,
including calls shaped like `this.validate(event.data)`, because they may be
validation, transformation, or unrelated application logic. A decorator-only
event therefore contributes an incomplete `any` fallback.

When a publisher for the same event is present, its payload is the only source of
payload evidence. This prevents handler implementation details from conflicting
with the actual published contract.

## Incomplete types and merging

An unresolved payload does not remove a known event. It produces an incomplete
`unknown` payload, allowing a later complete observation of the same event to
take precedence. For each event key, declaration generation:

1. groups decorator and publisher observations;
2. selects the single complete payload when one exists;
3. throws when multiple distinct complete payload texts conflict;
4. otherwise keeps the longest incomplete shape, with `unknown` as the final
   fallback; and
5. emits the resulting declaration entry in sorted event-name order.

Missing `data` and explicit `data: undefined` are treated as a complete `null`
payload. Library-owned lifecycle events are registered separately with an
incomplete `any` payload.

## Constraints and edge cases

- Dynamic event names are a separate limitation from dynamic payloads. If the
  event key cannot be statically resolved to a string, the occurrence is
  skipped and no payload entry can be generated.
- A dynamic publisher payload expression may still produce an event entry, but
  its payload is `unknown` unless another complete publisher observation supplies
  the type.
- Object properties that cannot be resolved remain incomplete rather than being
  assigned a guessed runtime type.
- Type references are preserved only when the scanner can associate the name
  with a source import or an exported type in the scanned module.
- The implementation remains independent of runtime package behavior and does
  not use a TypeScript `Program`, `ts-morph`, or a type checker.

## Related documentation

- [Event-map generator overview](../architecture/overview.md)
- [Identifier-based event-name resolution](./identifier-event-name-resolution-flow.svg)
- [Function-call payload resolution plan](../planning/function-call-payload-type-resolution.md)
- [EventMapScanner](../../../../../packages/plugins/event-map-generator/src/scan/EventMapScanner.ts)
- [ExpressionTypeUtils](../../../../../packages/utils/dota-ast-utils/src/utils/ExpressionTypeUtils.ts)
- [Payload type resolution flow](./payload-type-resolution-flow.svg)
