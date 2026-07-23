# Identifier-based event-name resolution

This document defines the narrow, predictable contract for resolving user event
constants in the event-map generator. Built-in Dota library events are registered
directly because their names are deterministic; user-defined values are resolved
only when their declaration follows the event-constant naming and immutability
rules below.

## Context and intent

The scanner currently discovers literal names from @OnEvent(...) and from the
name property of publish, publishAsync, and emit calls in
[EventMapScanner.ts](../../../../../packages/plugins/event-map-generator/src/scan/EventMapScanner.ts).

User code should be able to reuse one event name:

~~~ts
export const BLOG_PAGINATION_CHANGE_EVENT = 'blog:pagination:changed';

@OnEvent(BLOG_PAGINATION_CHANGE_EVENT)
publisher.publish({name: BLOG_PAGINATION_CHANGE_EVENT});
~~~

The implementation must remain syntax-only. It must not execute application code,
create a TypeScript Program, or infer the result of arbitrary expressions.

## Two event sources

### Built-in library events

Events owned by Dota libraries are deterministic and do not need identifier
resolution. Add them directly to the plugin's built-in event registry, for
example:

~~~ts
export const BUILT_IN_EVENT_NAMES = [
  'constructed',
  'connected',
  'disconnected',
  'attribute-changed',
  'dom-updated',
] as const;
~~~

The registry should be maintained in the event-map generator constants and merged
with scanned candidates before declaration generation. The scanner should not
crawl library implementation files to rediscover these names.

When a library adds or removes a public event, update this registry and its tests.
The registry is an explicit plugin contract, not a user extension point.

### User-defined events

User constants are resolved only when:

- the binding is a const declaration, or a static class property;
- the constant name contains an Event token;
- the initializer resolves to a string literal;
- imports and aliases resolve to a declaration that satisfies the same rules.

This naming requirement keeps the resolver fast and prevents every arbitrary
identifier in application code from becoming a cross-file lookup.

## User-facing naming guide

Use one of these canonical forms.

### Top-level constants

The name must contain EVENT as an uppercase token:

~~~ts
export const USER_CREATED_EVENT = 'user:created';
export const USER_EVENT_NAME = 'user:created';
~~~

The name may also contain Event as a camelCase or PascalCase token:

~~~ts
export const userCreatedEvent = 'user:created';
export const UserCreatedEvent = 'user:created';
~~~

EVENT_NAME technically matches the uppercase token rule, but a descriptive name
such as USER_CREATED_EVENT is preferred. Names such as VALUE, KEY, MESSAGE,
eventful, or eventName do not provide the required EVENT or Event token.

### Class-grouped constants

Use a class when events need a namespace. The event property must be static and
must contain EVENT or Event:

~~~ts
export class UserEvents {
  static readonly USER_CREATED_EVENT = 'user:created';
  static readonly userCreatedEvent = 'user:created';
}

@OnEvent(UserEvents.USER_CREATED_EVENT)
~~~

The resolver may accept static without readonly for compatibility, but
static readonly is the required authoring recommendation because it communicates
that the value is not intended to change.

The class name may be Events, UserEvents, or EventConstants. The property name is
the authoritative event-constant name. This form is supported:

~~~ts
UserEvents.USER_CREATED_EVENT
~~~

This form should not be supported by the first implementation because the
property name does not identify it as an event constant:

~~~ts
UserEvents.CREATED
~~~

### Imports and aliases

Named imports are supported when the imported declaration is resolvable:

~~~ts
import {USER_CREATED_EVENT} from './events.ts';
import {UserCreatedEvent as CREATED} from './user-events.ts';

@OnEvent(USER_CREATED_EVENT)
@OnEvent(CREATED)
~~~

The resolver validates the original declaration name, so a local alias such as
CREATED may resolve when it points to UserCreatedEvent. Authors should preserve
the event-oriented name in local aliases when possible because it keeps source
code self-describing.

Relative imports are the first supported cross-file boundary. Package imports
and Vite aliases require a configured source path or an included scan root; the
plugin must not guess at package source locations.

## Supported identifier variants

The resolver should support these expression forms:

| Source form | Required handling |
| --- | --- |
| 'user:created' | Return StringLiteral.value directly |
| USER_CREATED_EVENT | Resolve a same-file const binding |
| userCreatedEvent | Resolve a same-file const binding |
| EVENT as const | Unwrap TsAsExpression or TsConstAssertion |
| (USER_CREATED_EVENT) | Unwrap ParenthesisExpression |
| USER_CREATED_EVENT! | Unwrap TsNonNullExpression |
| imported alias | Follow the named import to its source declaration |
| UserEvents.USER_CREATED_EVENT | Resolve a static class property |

The first implementation should not support:

- let or var bindings;
- non-static class properties;
- computed properties such as UserEvents[EVENT_KEY];
- methods, getters, functions, or factory calls;
- object groups whose properties do not contain Event or EVENT;
- destructured constants;
- arbitrary string concatenation, environment values, or runtime lookups;
- unresolved package imports.

Unresolved values return null and are skipped. The plugin must never emit the
identifier text itself as an event name.

## Naming policy

Centralize the convention in one helper, for example:

~~~ts
isEventConstantName(name: string): boolean
~~~

The helper should recognize token boundaries rather than a loose substring:

- EVENT is a token between underscores or at a screaming-snake boundary;
- Event is a camelCase or PascalCase token boundary;
- eventful, eventName, and unrelated words containing event are not canonical
  matches unless the policy explicitly adds lowercase event.

Use the same policy for:

- top-level const declarations;
- imported/exported symbol names;
- static class property names;
- optional object-member support added later.

Do not apply the naming policy to direct string literals. A literal event name is
already explicit and must continue to work regardless of the surrounding symbol
names.

## Parsed-module index

Use two phases so imports are resolved without repeated filesystem work:

~~~text
discover scan files
    → read and parse every file once
    → index eligible const and static declarations
    → scan event call sites
    → resolve identifier expressions through the index
    → merge built-in and scanned names
    → generate the declaration
~~~

The current scanner reads, parses, and extracts one file at a time. Refactor it
to retain parsed modules before candidate extraction:

~~~ts
type ParsedEventModule = {
  sourceFile: string;
  sourceText: string;
  ast: Module;
  constants: Map<string, ConstantBinding>;
  staticProperties: Map<string, StaticPropertyBinding>;
  imports: Map<string, ImportBinding>;
  exports: Map<string, ExportBinding>;
};
~~~

Use an absolute normalized source path as the module-index key:

~~~ts
type EventModuleIndex = Map<string, ParsedEventModule>;
~~~

Index only eligible declarations. For a top-level VariableDeclarator, require an
identifier, a const parent VariableDeclaration, an Event/Event token in the
binding name, and an initializer. For a class property, require static,
an identifier property name containing the event token, and an initializer.

Retain declaration positions so the resolver can handle shadowing consistently.
A symbol resolution cycle must be stopped with a visited set such as
sourceFile + ':' + symbolName.

## Resolution algorithm

Implement a domain helper such as src/scan/EventNameResolver.ts. Keep event
extraction separate from constant resolution.

~~~text
resolve(expression, currentModule, index, visited):
  if StringLiteral:
    return expression.value

  if transparent wrapper:
    return resolve(innerExpression, currentModule, index, visited)

  if Identifier:
    if eligible same-file const exists:
      return resolve(const.initializer, currentModule, index, visited)

    if imported binding exists:
      targetPath = resolveImportPath(currentModule, import.source)
      targetModule = index.get(targetPath)
      declaration = findExportedEventConstant(targetModule, import.importedName)
      return resolve(declaration.initializer, targetModule, index, visited)

    return null

  if non-computed MemberExpression:
    className = expression.object
    propertyName = expression.property
    staticProperty = findStaticEventProperty(currentModule, className, propertyName)
    return resolve(staticProperty.initializer, currentModule, index, visited)

  return null
~~~

Each recursive step must:

- reject missing declarations and missing modules with null;
- reject declarations whose name does not satisfy the naming policy;
- reject cycles using visited;
- never read or execute runtime values;
- preserve deterministic results when multiple files contain similar names.

## Import and path resolution

Resolve relative imports from the importing source file's directory:

~~~text
./events.ts
./events/index.ts
~~~

Only resolve a target that exists in the parsed-module index. The scanner's
configured scanRoots define the source boundary. If a declaration is outside
those roots, add the owning source root explicitly or provide a documented
resolver mapping; do not recursively crawl the entire repository or dependency
tree.

Support these declaration/export forms:

- export const USER_CREATED_EVENT = 'user:created';
- const USER_CREATED_EVENT = 'user:created'; export {USER_CREATED_EVENT};
- export {USER_CREATED_EVENT as UserCreatedEvent};
- static readonly USER_CREATED_EVENT = 'user:created' in an indexed class.

Re-export chains may be followed with the same visited guard. A missing export or
unsupported declaration returns null.

## Scanner refactor

Update both extraction paths in EventMapScanner:

1. For @OnEvent, read the first argument expression with
   DecoratorView.getArgument(0). Do not use getStringArgument(), because it only
   accepts literals.
2. For publishers, read the name property's expression and pass it to the
   resolver. Do not use KeyValuePropertyView.getString() for this path.
3. Keep publish, publishAsync, and emit on the same resolver policy.
4. Preserve payload-type inference, candidate merging, sorting, and location
   collection.
5. Merge BUILT_IN_EVENT_NAMES before declaration generation.
6. Keep the scanner free of TypeScript checker calls, ts-morph, runtime imports,
   and arbitrary expression evaluation.

No new Vite lifecycle hook is needed. The existing rebuild behavior already
regenerates the declaration when a TypeScript source or constant changes.

## Source locations

A literal event has a literal source span. An identifier-based event should point
to the identifier expression at the decorator or publisher call site. Keep the
existing occurrence location meaning stable by documenting it as an event-key
expression rather than an event-key literal.

If declaration navigation is needed later, add a separate optional resolved
declaration location. Do not replace the occurrence location with the constant
declaration location.

## Tests

Add or update scanner tests for:

- direct literal names, preserving existing behavior;
- uppercase EVENT names;
- camelCase and PascalCase Event names;
- same-file const identifiers;
- static readonly class properties;
- static class properties for compatibility;
- named imports, aliases, and re-export chains;
- transparent wrappers: as const, parentheses, and non-null;
- built-in library event names without source scanning;
- names that contain event as an unrelated substring being skipped;
- let, var, non-static, computed, dynamic, and function-based values being skipped;
- missing modules, missing exports, and circular aliases;
- deterministic output when a constant is referenced repeatedly;
- identifier-based source locations.

Use fixture files for cross-module cases so import path resolution and AST
indexing are tested together. Keep built-in event tests separate from user
constant tests so changes to library registrations do not hide resolver bugs.

## Related documentation

- [Event-map generator overview](../architecture/overview.md)
- [Event-map generator package README](../../../../../packages/plugins/event-map-generator/README.md)
- [Function-call payload type resolution](./function-call-payload-type-resolution.md)
