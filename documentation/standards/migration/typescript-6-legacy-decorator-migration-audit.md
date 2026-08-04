# Standard decorator migration sandbox audit

This report explains how the Dota workspace can move from TypeScript's legacy experimental decorators to standard JavaScript decorators. It is written for maintainers who need to understand both the source change and the runtime consequences before approving an implementation.

The migration was implemented and exercised in an isolated workspace copy on August 3, 2026. No application, library, plugin, UI, utility, manifest, lockfile, or configuration source in the working repository was changed by that exercise. This report is the only deliverable written back to the repository.

## Status and conclusion

**Status: feasible and verified in a sandbox, but not implemented in the repository.**

The isolated candidate reached the following result:

| Check | Sandbox result |
| --- | --- |
| TypeScript mode | Standard decorators; no `experimentalDecorators` or `emitDecoratorMetadata` |
| Decorator implementations converted | 19: 15 in `dota-core`, 2 in `dota-event`, 1 in `dota-router`, and the app-owned `WithLoading` decorator |
| Authoring syntax | Unchanged: consumers still write `@Component`, `@Property`, `@OnEvent`, and the other public names |
| Workspace tests | 1,062 passed |
| Workspace builds | All 13 passed |
| `dota-core` | 365 tests passed; build passed |
| `dota-event` | 181 tests passed; build passed |
| `dota-router` | 116 tests passed; build passed |
| `dota-ui` | 94 tests passed; build passed |
| `dota-web` | Type check and production build passed; 388 modules transformed |
| Source discovery | 76 components, 8 routes, and 19 application-event entries discovered during the app build |
| Legacy emitted helpers | No `__decorate`, `__metadata`, or `design:type` output found in the migrated core/event/router bundles |

The migration is not a syntax replacement. The visible annotation stays the same, but the function called behind it receives different arguments and runs against a different metadata model.

The most important implementation conclusions are:

1. Member decorators must stop expecting a prototype, property key, and descriptor. Standard member decorators receive the member value and a context object.
2. Dota needs one standard metadata bridge based on `context.metadata` and `Symbol.metadata`.
3. `@Component` must finalize `observedAttributes` because a standard field decorator cannot directly reach the owning constructor while the class is being defined.
4. Most `BaseElement` methods can remain textually unchanged if `HelperUtils.fetchOrCreate` becomes the bridge between an element instance and standard class metadata.
5. `BaseElement` must stop declaring and assigning `shadowRoot`; the browser already provides it as a read-only property.
6. Vite 8 cannot currently lower standard decorators with its Oxc transform. A separate standard-decorator transform is required.
7. The workspace's current `@swc/core` `1.13.5` is not sufficient. It crashed when asked to use the `2023-11` decorator transform. The sandbox passed after upgrading it to `1.15.47` and using `@rollup/plugin-swc` `0.4.1`.

## Scope of the audit

The audit covered:

- all decorator implementations under `dota-core`, `dota-event`, and `dota-router`;
- the app-owned `WithLoading` decorator that was found only after the full app type check;
- every `BaseElement` method that consumes decorator metadata;
- `PropertyUtils`, `EventManagerService`, router metadata readers, and application-event bind managers;
- TypeScript, Vite, Vitest, SWC, declaration generation, and source-scanning behavior;
- inheritance, sibling isolation, custom-element registration, routing, events, and emitted bundles through the existing test and build suites.

The authoring inventory under production `src` directories contains 478 annotation lines across 106 files. The counts are:

| Annotation | Production source occurrences |
| --- | ---: |
| `@Property` | 204 |
| `@Component` | 110 |
| `@OnEvent` | 58 |
| `@AfterInit` | 25 |
| `@HostListener` | 24 |
| `@BindEvent` | 17 |
| `@WindowListener` | 13 |
| `@Route` | 8 |
| `@Param` | 7 |
| `@Emitter` | 4 |
| `@Watcher` | 2 |
| `@State` | 2 |
| `@AutoBind`, `@DocumentListener`, `@Element`, and `@WithLoading` | 1 each |

`@BeforeInit`, `@Expose`, and `@EventListener` have implementations and tests or documented API relevance, but no active annotation line was found under a production `src` directory. They still have to be migrated because they are published API.

## Terminology

This report uses the following terms:

- **Legacy decorator** means the older TypeScript behavior enabled by `experimentalDecorators`.
- **Standard decorator** means the JavaScript decorator behavior TypeScript uses when `experimentalDecorators` is absent.
- **Decorator factory** means a function such as `Property(config)` that returns the actual decorator function.
- **Metadata producer** means a decorator that records information.
- **Metadata consumer** means `BaseElement`, the router, or an event manager that reads the recorded information later.
- **Design metadata** means TypeScript's emitted `design:type`, `design:paramtypes`, and `design:returntype` entries. Dota's own metadata is different and does not use those keys.

## How the current implementation works

### Legacy call shapes

The current decorators use three legacy function shapes:

```ts
// Class decorator
(target: Function) => void | Function

// Method decorator
(target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void

// Field/property decorator
(target: object, propertyKey: string | symbol) => void
```

For a non-static member, `target` is the class prototype. That detail is the foundation of the current metadata system: a member decorator writes metadata to the prototype, and an instance later sees it through its prototype chain.

### The current Dota metadata store

Most `dota-core` decorators call:

```ts
HelperUtils.fetchOrCreate<T>(target, appender)
```

The helper creates a string key from the prototype constructor's name:

```ts
const key = `${target.constructor.name}:${appender}`
```

It then stores a `Map<string, T>` with `reflect-metadata`:

```ts
if (!Reflect.hasMetadata(key, target)) {
  Reflect.defineMetadata(key, new Map<string, T>(), target)
}

return Reflect.getMetadata(key, target)
```

For example, a class called `UserCard` receives keys such as:

- `UserCard:Property`;
- `UserCard:After`;
- `UserCard:Host`;
- `UserCard:Watcher:userId`.

When `BaseElement` calls the same helper with `this`, `Reflect.getMetadata` walks the object's prototype chain and finds the map written by the decorator.

### Current class metadata

`@Component` and `@Route` write directly to constructors:

```ts
Reflect.defineMetadata('Component', config, target)
Reflect.defineMetadata('Route', routeConfig, target)
```

`@Component` also writes two public static fields that are already the primary runtime path:

```ts
target.__dotaSelector = config.selector
target.__dotaShadow = config.shadow
```

`bootstrap` reads `__dotaSelector`, and `BaseElement.bindHTML` reads `__dotaShadow`.

The audit found no in-repository runtime reader for the additional method snapshot stored under the Reflect key `target.name`, but the sandbox retained it because published external consumers may rely on it. It should be removed only after that compatibility question is answered.

### Current decorator-to-consumer flow

```text
Member decorator runs while the class is defined
        ↓
Map is written to the class prototype with reflect-metadata
        ↓
An element instance is constructed
        ↓
BaseElement.connectedCallback starts binding work
        ↓
HelperUtils.fetchOrCreate(this, bucket) walks the prototype chain
        ↓
BaseElement or PropertyUtils performs the recorded behavior
```

This works only because legacy member decorators receive the prototype. Standard member decorators do not.

## What standard decorators receive

Standard decorators use these shapes:

```ts
// Class
(value: typeof SomeClass, context: ClassDecoratorContext) => void | typeof SomeClass

// Method
(value: Function, context: ClassMethodDecoratorContext) => void | Function

// Field
(initialValue: undefined, context: ClassFieldDecoratorContext) => void | Initializer
```

The context supplies information such as:

```ts
context.kind       // "class", "method", or "field"
context.name       // string or symbol member name
context.static     // whether the member is static
context.private    // whether the member is private
context.addInitializer(...)
context.metadata
```

There is no prototype argument and no method descriptor. A standard method decorator receives the method function itself. A standard field decorator receives `undefined`, not the field's runtime value or owning constructor.

TypeScript documents that standard decorators are not compatible with `emitDecoratorMetadata` and do not support parameter decorators. Dota does not currently publish a parameter decorator in the TypeScript sense: `@Param` is a field decorator that maps a field to a URL parameter, so it remains supported.

See [TypeScript 5.0: decorators and legacy differences](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#differences-with-experimental-legacy-decorators).

## The metadata design used by the passing sandbox

### `Symbol.metadata` must exist before decorated classes are evaluated

The sandbox runtime was Node `26.4.0`, where `Symbol.metadata` was still `undefined`. Standard decorator metadata therefore required this early initialization:

```ts
if (!Symbol.metadata) {
  Object.defineProperty(Symbol, 'metadata', {
    configurable: true,
    value: Symbol.for('Symbol.metadata'),
  })
}
```

The initialization lived in a module imported by the decorator implementations. Dependency modules are evaluated before the component module applies its decorators, so the symbol exists when TypeScript/SWC creates the class metadata object.

TypeScript's own decorator-metadata guidance also requires a `Symbol.metadata` polyfill in runtimes that do not provide it. See [TypeScript 5.2: decorator metadata](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata).

### One private Dota key owns the core metadata buckets

The sandbox used a stable symbol instead of constructor-name strings:

```ts
const DOTA_DECORATOR_METADATA = Symbol.for(
  '@ayu-sh-kr/dota:decorator-metadata',
)

type DotaDecoratorMetadataStore =
  Map<string, Map<string, unknown>>
```

`context.metadata[DOTA_DECORATOR_METADATA]` owns maps named `Property`, `After`, `Host`, and so on. The public metadata record is not filled with Dota's string keys, and minifying or renaming a constructor cannot change the lookup key.

### Inherited maps must be cloned before mutation

Standard metadata objects inherit from the parent class's metadata object. Reusing an inherited `Map` directly would make a subclass modify its parent and its siblings.

The sandbox helper used this rule:

```ts
if (!Object.hasOwn(metadata, DOTA_DECORATOR_METADATA)) {
  const inherited = metadata[DOTA_DECORATOR_METADATA]
  const ownStore = new Map(
    inherited
      ? [...inherited].map(([bucket, values]) => [
          bucket,
          new Map(values),
        ])
      : [],
  )

  Object.defineProperty(
    metadata,
    DOTA_DECORATOR_METADATA,
    {value: ownStore},
  )
}
```

This preserves inherited decorator behavior while keeping parent and sibling classes isolated. The existing inheritance and sibling-isolation tests passed with this design.

### `HelperUtils` becomes the compatibility boundary

The sandbox added a decorator-time operation:

```ts
HelperUtils.fetchOrCreateDecorator<T>(
  context.metadata,
  bucket,
)
```

It also changed the existing runtime operation to check standard metadata first:

```ts
HelperUtils.fetchOrCreate<T>(instanceOrClass, bucket)
```

The runtime helper resolves the constructor, reads `constructor[Symbol.metadata]`, finds the Dota store, and returns the requested map. If no standard map exists, it can fall back to the current `reflect-metadata` path during a compatibility release.

This bridge is why most `BaseElement` methods did not need to be rewritten. Their request remains “give me the `Host` map for this instance”; only the helper changes how that map is found.

## Every decorator: current and migrated behavior

### Complete behavior map

| Decorator | Current implementation | Standard implementation used in the sandbox | Runtime consumer |
| --- | --- | --- | --- |
| `@Component(config)` | Receives the constructor; scans prototype methods; writes three Reflect entries; assigns `__dotaSelector` and `__dotaShadow` | Receives `(constructor, context)`; records class metadata; keeps selector/shadow statics; derives `observedAttributes` from completed property metadata | `bootstrap`, `BaseElement.bindHTML`, router helpers |
| `@Property(config)` | Receives prototype/key; immediately pushes the attribute into `target.constructor.observedAttributes`; stores `PropertyDetails` | Receives `(undefined, context)`; stores `PropertyDetails` in `context.metadata`; `@Component` later creates `observedAttributes` | `PropertyUtils.bindReactive`, `BaseElement.bindProperty` |
| `@State()` | Receives prototype/key; stores `{prototype}` | Receives `(undefined, context)`; stores `{prototype: String(context.name)}` | `BaseElement.bindState` |
| `@Param(name?)` | Receives prototype/key; stores the URL parameter name | Receives `(undefined, context)`; stores the same record using `context.name` | `BaseElement.bindParameters` |
| `@Element(config)` | Receives prototype/key; stores selector configuration and property name | Receives `(undefined, context)`; stores the same record using `context.name` | `BaseElement.bindElements` |
| `@Emitter(name?)` | Receives prototype/key; derives the event name and stores `EventDetails` | Receives `(undefined, context)`; derives the same name from `context.name` | `BaseElement.bindEmitter` |
| `@BeforeInit()` | Receives prototype/key/descriptor; stores `descriptor.value` in `Before` | Receives `(method, context)`; stores the method in `Before` | `BaseElement.handleBeforeInit` |
| `@AfterInit()` | Receives prototype/key/descriptor; stores `descriptor.value` in `After` | Receives `(method, context)`; stores the method in `After` | `BaseElement.handleAfterInit` |
| `@BindEvent(config)` | Receives prototype/key/descriptor; stores selector/event configuration | Receives `(method, context)`; the method value is not needed; stores config under `context.name` | `BaseElement.bindMethods` and `unbindMethods` |
| `@Expose()` | Receives prototype/key/descriptor; stores name and function | Receives `(method, context)`; stores name and method value | `BaseElement.exposeMethods` |
| `@HostListener(options)` | Receives prototype/key/descriptor; stores event, name, and function | Receives `(method, context)`; stores the same record | `BaseElement.bindHostEvents` and `unbindHostEvents` |
| `@WindowListener(options)` | Same pattern as host, in the `Window` bucket | Standard method/context pattern | `BaseElement.bindWindowEvents` and `unbindWindowEvents` |
| `@DocumentListener(options)` | Same pattern as host, in the `Document` bucket | Standard method/context pattern | `BaseElement.bindDocumentEvents` and `unbindDocumentEvents` |
| `@Watcher(property)` | Receives prototype/key/descriptor; writes one record per `Watcher:<property>` bucket | Receives `(method, context)`; writes the same records with `context.name` | `PropertyUtils.bindWatchers` |
| `@EventListener(config)` | Replaces prototype lifecycle methods and repeatedly calls `method.bind(this)` | Uses `context.addInitializer` to wrap each instance's lifecycle and retain one bound handler reference | Direct connected/disconnected lifecycle behavior |
| `@OnEvent(name, scoped?)` | Receives prototype/key; appends metadata to an array stored on the constructor with Reflect | Receives `(method, context)`; appends `{name, method: context.name, scoped}` under an event-specific symbol | Global and scoped application-event bind managers |
| `@AutoBind()` | Returns a hand-written replacement constructor using `Reflect.construct`; repairs prototype, static chain, and name | Returns `class extends Original`; calls the bind manager after `super`; explicitly restores the original class name | Construction of auto-bound services |
| `@Route(config)` | Receives constructor; writes a complete `RouteConfig` with Reflect | Receives `(constructor, context)`; constructor access remains available; sandbox retained the Reflect entry for router/test compatibility | `RouterUtils` and route preparation |
| `@WithLoading()` | App-owned legacy method decorator mutates `descriptor.value` | Returns a replacement method that toggles before work and in promise settlement/error paths | `DocContentComponent.afterViewInit` |

### Representative field decorator: `@Property`

Current:

```ts
function PropertyDecorator(config: PropertyConfig): PropertyDecorator {
  return function (target, propertyKey) {
    if (!target.constructor.observedAttributes) {
      target.constructor.observedAttributes = []
    }

    target.constructor.observedAttributes.push(config.name)

    HelperUtils.fetchOrCreate<PropertyDetails>(
      target,
      'Property',
    ).set(config.name, {
      name: config.name,
      prototype: propertyKey.toString(),
      default: config.default,
      type: config.type,
    })
  }
}
```

Migrated shape:

```ts
function PropertyDecorator(config: PropertyConfig) {
  return function <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ) {
    HelperUtils.fetchOrCreateDecorator<PropertyDetails>(
      context.metadata,
      'Property',
    ).set(config.name, {
      name: config.name,
      prototype: context.name.toString(),
      default: config.default,
      type: config.type,
    })
  }
}
```

The important change is not the types. The field decorator can no longer mutate `target.constructor`, because no target is provided. It only records the property. Class finalization happens in `@Component`.

### Representative method decorator: `@AfterInit`

Current:

```ts
return function (target, propertyKey, descriptor) {
  HelperUtils.fetchOrCreate<Function>(target, 'After')
    .set(propertyKey.toString(), descriptor.value)

  return descriptor
}
```

Migrated shape:

```ts
return function <This, Value extends (
  this: This,
  ...args: any[]
) => any>(
  value: Value,
  context: ClassMethodDecoratorContext<This, Value>,
) {
  HelperUtils.fetchOrCreateDecorator<Function>(
    context.metadata,
    'After',
  ).set(context.name.toString(), value)
}
```

There is no descriptor to return because the decorator is only recording the original method. Decorators that intentionally wrap a method, such as `WithLoading`, return a replacement function instead.

### `@Component` becomes the class finalizer

The migrated class decorator runs after member decorators and can see the property map they created:

```ts
function ComponentDecorator(config: ComponentConfig) {
  return function (
    target: any,
    context: {readonly metadata: DecoratorMetadata},
  ) {
    const classMetadata =
      HelperUtils.fetchOrCreateDecorator(
        context.metadata,
        'Class',
      )

    classMetadata.set('Component', config)

    target.__dotaSelector = config.selector
    target.__dotaShadow = config.shadow

    const properties =
      HelperUtils.fetchOrCreateDecorator(
        context.metadata,
        'Property',
      )

    Object.defineProperty(target, 'observedAttributes', {
      configurable: true,
      value: [...properties.keys()],
    })
  }
}
```

This guarantees `observedAttributes` exists before `customElements.define` is called. It also centralizes the class-level work in the one decorator that represents a Dota custom element.

The sandbox used `target: any` and a minimal metadata context deliberately. Typing the target as `DotaElementConstructor` or as a normal `abstract new (...args) => BaseElement` rejected components that inherit `BaseElement`'s protected constructor. A repository implementation should introduce a decorator-specific class type or retain the localized escape hatch; it should not pretend the existing public-constructor type accepts those classes.

A plain class with `@Property` but no `@Component` can still expose Dota property metadata, but it cannot receive an eager `observedAttributes` array from the standard field decorator alone. The sandbox changed the one unit test for that legacy-only assumption to decorate the test class with `@Component`. Production Dota elements already use `@Component`, so no production authoring site changed.

### `@OnEvent` needs a store that does not create a dependency cycle

`dota-core` depends on `dota-event`, so `dota-event` must not import the core helper merely to store decorator metadata. The sandbox used a separate stable event symbol:

```ts
const EVENTS_METADATA_SYMBOL =
  Symbol.for('@ayu-sh-kr/dota:on-event')
```

The standard decorator clones an inherited array before appending the class's own handler. `getOnEventMetadata` reads:

```ts
constructor[Symbol.metadata]?.[EVENTS_METADATA_SYMBOL]
```

and can fall back to the current Reflect key during a compatibility release.

### `@AutoBind` is simpler under standard class replacement

The current implementation manually calls `Reflect.construct`, replaces the prototype, copies the static prototype chain, and restores the name.

The standard candidate can use normal inheritance:

```ts
function AutoBindDecorator() {
  return <T extends new (...args: any[]) => object>(
    Original: T,
    _context: ClassDecoratorContext<T>,
  ): T => {
    const AutoBound = class extends Original {
      constructor(...args: any[]) {
        super(...args)

        const listener =
          DefaultApplicationEventListenerRegistry
            .getListener()

        new DefaultClassApplicationEventBindManager(
          this,
          listener,
        ).bind()
      }
    }

    Object.defineProperty(
      AutoBound,
      'name',
      {value: Original.name},
    )

    return AutoBound as T
  }
}
```

The first sandbox attempt omitted the explicit name restoration. One test failed because the anonymous replacement's name was empty. Restoring the name made all 181 `dota-event` tests pass.

### `@EventListener` must retain the bound handler

The current implementation adds and removes two different function objects:

```ts
addEventListener(name, method.bind(this))
removeEventListener(name, method.bind(this))
```

Calling `bind` twice produces different references, so removal is not reliable. The standard migration is a chance to preserve the intended behavior:

```ts
context.addInitializer(function () {
  const handler = value.bind(this)

  this.connectedCallback = () => {
    originalConnected?.call(this)
    eventTarget.addEventListener(name, handler)
  }

  this.disconnectedCallback = () => {
    eventTarget.removeEventListener(name, handler)
    originalDisconnected?.call(this)
  }
})
```

The initializer runs for each instance, which is the correct place to create an instance-bound function. This decorator currently has no production annotation site, so a final implementation should add direct connect/disconnect identity tests before release.

### `@Route` can migrate independently from the member store

A standard class decorator still receives the class constructor. The route object can therefore be assembled exactly as it is today. The sandbox kept:

```ts
Reflect.defineMetadata('Route', routeConfig, target)
```

to preserve current router readers and the direct decorator test. This proves the decorator semantics can be migrated without simultaneously replacing every class-metadata reader.

The current route test also invokes the returned decorator directly with only the constructor. The sandbox therefore made the context argument optional for `@Route`. Normal `@Route(...)` syntax still supplies the standard context; the optional argument only preserves that direct invocation contract.

The cleaner final state is to put `Route` into standard class metadata and change `RouterUtils` to use one helper. That removal should be a separate compatibility decision because external consumers may read the existing Reflect entry.

### `@WithLoading` was an inventory gap found by the full build

The first full app type check failed after all published decorators were converted. `DocContentComponent` also uses an app-owned legacy method decorator:

```ts
@AfterInit()
@WithLoading()
async afterViewInit() { /* ... */ }
```

The standard form returns a function and preserves promise cleanup:

```ts
export function WithLoading() {
  return function <This, Args extends any[], Return>(
    original: (
      this: This,
      ...args: Args
    ) => Promise<Return>,
    _context: ClassMethodDecoratorContext,
  ) {
    return function (
      this: This,
      ...args: Args
    ): Promise<Return> {
      LoaderService.toggle()

      try {
        return original
          .apply(this, args)
          .finally(() => LoaderService.toggle())
      } catch (error) {
        LoaderService.toggle()
        throw error
      }
    }
  }
}
```

This discovery is why the real migration must search the entire workspace, not only packages whose main purpose is decorators.

## What changes in `BaseElement`

### The short answer

`BaseElement` does not need a new lifecycle or a second binding system. Its existing methods can keep asking for named metadata maps. `HelperUtils` translates those requests to `Symbol.metadata`.

Only the shadow-root handling required a direct source correction in the passing sandbox.

### Method-by-method impact

| `BaseElement` area | What it does now | What changes after migration |
| --- | --- | --- |
| Constructor | Reads `__dotaSelector`, creates event managers/channel, emits `CONSTRUCTED` | No decorator-specific change; selector remains a constructor static assigned by `@Component` |
| `connectedCallback` | Calls lifecycle, rendering, property/state/element, DOM event, and application-event bind operations | Ordering and Promise aggregation remain unchanged |
| `disconnectedCallback` | Unbinds DOM and application events | Unchanged |
| `handleBeforeInit` | Reads `Before`, then calls the entry named `beforeViewInit` | Source can remain unchanged; the helper now returns the standard metadata map |
| `handleAfterInit` | Reads `After`, then calls `afterViewInit` | Same as `handleBeforeInit` |
| `bindHTML` | Reads `__dotaShadow`; assigns the result of `attachShadow` to `this.shadowRoot` | Stop declaring/assigning the read-only platform property; use the local result of `attachShadow` |
| `bindProperties` / `unbindProperties` | Delegate to `PropertyUtils` | No direct change; `PropertyUtils` obtains `Property` through the new helper |
| `bindProperty` | Looks up an attribute in the `Property` map and sanitizes it | Source unchanged |
| `bindState` | Iterates `State` and installs reactive accessors | Source unchanged |
| `bindMethods` / `unbindMethods` | Iterate `Bind` and manage delegated listeners | Source unchanged |
| `exposeMethods` | Iterates `Exposed` and binds methods on `window` | Source unchanged |
| `bindEmitter` | Iterates `Output` and creates `EventEmitter` instances | Source unchanged |
| Host/window/document bind and unbind methods | Read their named buckets and delegate to `EventManagerService` | Source unchanged |
| `bindParameters` | Iterates `Param` and reads query parameters | Source unchanged |
| `bindElements` | Iterates `Element` and queries the light or shadow DOM | Only strict null handling changes after removing the custom `shadowRoot` declaration |
| `updateHTML` | Re-renders and rebinds delegated methods/elements | Behavior unchanged |

### Why the helper approach is preferable

Without a bridge, every consumer would need code like:

```ts
this.constructor[Symbol.metadata]
  ?.[DOTA_DECORATOR_METADATA]
  ?.get('Host')
```

Repeating that in every binding method would couple `BaseElement`, `PropertyUtils`, and future consumers to metadata layout details. Keeping the lookup in `HelperUtils` gives maintainers one place to handle:

- the symbol polyfill;
- standard metadata;
- inherited-map cloning;
- a temporary Reflect fallback;
- missing metadata;
- future storage-version changes.

### Exact `shadowRoot` correction

Current class field and binding:

```ts
shadowRoot!: ShadowRoot

this.shadowRoot = this.attachShadow({mode: 'open'})
this.shadowRoot.innerHTML = this.render()
```

Migrated form:

```ts
// No shadowRoot field. HTMLElement already declares it.

const shadowRoot = this.attachShadow({mode: 'open'})
shadowRoot.innerHTML = this.render()
```

The first sandbox run produced four shadow-component failures because the SWC standard transform exposed the attempted write to a getter-only platform property. Removing the duplicate declaration and assignment fixed all failures. Later reads use `this.shadowRoot!` only after `bindHTML` has attached it.

## TypeScript configuration changes

Current decorated projects include:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

The standard form is:

```json
{
  "compilerOptions": {
    "lib": [
      "ES2023",
      "ESNext.Decorators",
      "DOM",
      "DOM.Iterable"
    ]
  }
}
```

Rules:

- remove `experimentalDecorators`; do not write it as `false`;
- remove `emitDecoratorMetadata` because standard decorators are incompatible with it;
- add `ESNext.Decorators` where `Symbol.metadata` types are used;
- retain `useDefineForClassFields: true`;
- keep `isolatedModules: true` for Vite's file-at-a-time transform.

No Dota source reads `design:type`, `design:paramtypes`, or `design:returntype`. Removing emitted design metadata therefore did not remove an in-repository runtime input.

## Vite and Vitest transform changes

### Why removing `legacy: true` is not enough

Current configs explicitly select legacy Oxc behavior:

```ts
oxc: {
  decorator: {
    legacy: true,
  },
}
```

That block must be removed, but Vite 8's Oxc transformer still cannot lower standard decorators to the browser targets used by the workspace. Vite's migration guide explicitly recommends Babel or SWC as a temporary lowering step. See [Vite 8 migration: lowering native decorators](https://vite.dev/guide/migration.html#javascript-transforms-by-oxc).

### Passing sandbox transform

The sandbox used one shared `.mts` factory:

```ts
import swc from '@rollup/plugin-swc'
import {withFilter} from 'vite'

export const standardDecorators = () => withFilter(
  swc({
    include: ['**/*.ts', '**/*.tsx'],
    exclude: ['**/node_modules/**'],
    swc: {
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorVersion: '2023-11',
        },
      },
    },
  }),
  {transform: {code: '@'}},
)
```

Each Vite or Vitest config that compiles annotated source includes:

```ts
plugins: [
  standardDecorators(),
  // existing plugins
]
```

The helper used `.mts`, not `.ts`, because a root `.ts` ESM helper produced a Vite config-loader warning in this workspace, whose root package is not declared as `type: "module"`.

### Required dependency correction

The following attempt failed:

```text
@swc/core 1.13.5
decoratorVersion: "2023-11"
→ native panic: "not yet implemented: 2023-11 decorator"
```

The passing sandbox used:

```yaml
'@rollup/plugin-swc': 0.4.1
'@swc/core': 1.15.47
```

This is a hard prerequisite for the tested SWC route. A maintainer must not add the transform while leaving `@swc/core` at `1.13.5`.

In the recorded full app build, the SWC plugin accounted for 31% of reported plugin time. That is one run, not a benchmark, but it is enough to justify measuring development/HMR latency before release.

## `reflect-metadata` after the migration

Three concerns must be separated:

1. TypeScript design metadata;
2. Dota member metadata;
3. class metadata compatibility.

The sandbox removed the first concern by removing `emitDecoratorMetadata`.

It moved Dota member metadata to `context.metadata`/`Symbol.metadata`.

It deliberately retained Reflect writes for `Component` and `Route` as a compatibility bridge because current tests and router code read those entries directly. This means a first standard-decorator release does not have to remove the `reflect-metadata` package at the same time.

Recommended release boundary:

1. ship standard-capable metadata producers and readers with a Reflect fallback;
2. migrate workspace consumers and prove published declarations/bundles;
3. decide whether external access to `Reflect.getMetadata('Component' | 'Route', constructor)` is supported public behavior;
4. only then remove the fallback and package dependency.

## Sandbox process and failures

The audit did not jump directly to a green result. The failures are useful migration requirements.

### 1. Installed SWC crashed

Cause: `@swc/core` `1.13.5` did not implement the configured `2023-11` transform.

Resolution in sandbox: upgrade to `1.15.47` and add `@rollup/plugin-swc` `0.4.1`.

### 2. Four shadow-root tests failed

Cause: `BaseElement` declared and assigned the read-only `HTMLElement.shadowRoot` property.

Resolution: remove the duplicate field, keep the `attachShadow` result local, and narrow later reads after attachment.

### 3. The property observed-attribute test failed

Cause: a standard field decorator cannot synchronously mutate its owning constructor.

Resolution: make `@Component` finalize `observedAttributes`; update the plain-class unit test to model a component.

### 4. One auto-bind identity test failed

Cause: the first replacement subclass had an empty class name.

Resolution: restore `Original.name` on the replacement.

### 5. The app found one more legacy decorator

Cause: the initial inventory focused on published framework decorators and missed app-owned `@WithLoading`.

Resolution: convert it to a standard method wrapper. This proves the full workspace type check is a required discovery tool.

### 6. A clean full-workspace test first stopped in `dota-ast-utils`

Cause: its TypeScript config did not explicitly load Node and Vitest globals under the current TypeScript 6 defaults.

Resolution in sandbox: add `types: ["node", "vitest/globals"]`.

This was not caused by decorator semantics, but a clean isolated install exposed it. It should be kept as a small configuration prerequisite rather than mixed into decorator runtime code.

### 7. A strict `@Component` constructor type did not compile

Cause: `DotaElementConstructor` includes a public construct signature, while `BaseElement` declares a protected constructor. Test components that rely on the inherited protected constructor are not structurally assignable to that type at decorator application time.

Resolution in sandbox: keep the decorator target localized as `any` and type only the metadata property used from the context. A final implementation should decide whether to add a dedicated decorator target contract or accept this narrow escape hatch.

## Verification evidence

### Test totals

| Package | Tests passed |
| --- | ---: |
| `dota-core` | 365 |
| `dota-event` | 181 |
| `dota-rest` | 26 |
| `dota-router` | 116 |
| `dota-ast-utils` | 148 |
| `dota-common-utils` | 1 |
| `event-map-generator` | 42 |
| `web-type-json` | 83 |
| `dota-vite-preloader` | 4 |
| `dota-ui` | 94 |
| `dota-wrap` | 2 |
| **Total** | **1,062** |

All 13 recursive workspace builds passed after the candidate changes.

### What the green result proves

It proves that the sandbox design preserves the behaviors covered by the current suites, including:

- component registration and observed attributes;
- property, state, watcher, parameter, emitter, lifecycle, element, and DOM-event binding;
- global and scoped application events;
- `AutoBind` construction and class identity expectations;
- route metadata and router behavior;
- declaration generation;
- Vite application and library builds;
- component, route, event, and Web Types source scanning;
- CJS and ESM output generation performed by the existing builds.

### Existing warnings that did not fail the migration

The passing build still reported existing toolchain warnings:

- API Extractor used a bundled TypeScript `5.9.3` engine to analyze TypeScript `6.0.3` output;
- some plugin entry points mix default and named exports;
- Browserslist data is stale;
- Tailwind reported a broad content pattern;
- the app bundle exceeded the configured chunk-size warning threshold;
- `dota-ui` tests logged `happy-dom` fetch aborts during teardown even though every test passed.

These warnings should not be misreported as decorator regressions, but they remain maintenance work.

## What was not proven

The report intentionally does not claim the following:

- no real-browser Playwright smoke test was run;
- Vite development mode, HMR, add/change/unlink watcher behavior, and cold-start time were not measured;
- a packed external consumer was not installed from tarballs;
- a previously compiled legacy consumer was not run against the standard-only decorator implementation;
- the Reflect compatibility layer was not removed;
- `@EventListener` has no active production usage and needs focused new lifecycle tests;
- bundle size and transform time were observed but not compared through repeatable benchmarks;
- browser support without SWC lowering was not attempted, because the configured browser targets do not justify emitting native decorator syntax.

These are release gates, not reasons to reject the demonstrated runtime design.

## Recommended implementation order

### Phase 1: introduce the metadata bridge

1. Add the `Symbol.metadata` initialization in a module guaranteed to run before decorated classes.
2. Add typed standard metadata helpers and inherited-map cloning.
3. Make runtime lookup standard-first with a legacy Reflect fallback.
4. Add explicit tests for parent, child, and sibling metadata isolation.

### Phase 2: convert published decorators without switching consumers

1. Convert `dota-event` decorators.
2. Convert `dota-core` method decorators.
3. Convert `dota-core` field decorators.
4. Convert `@Component` and move `observedAttributes` finalization there.
5. Convert `@Route` while keeping its Reflect bridge.
6. Convert or test `@EventListener` separately because it changes lifecycle wrapping.

A dual-call-shape release is required if published packages must continue supporting applications compiled with `experimentalDecorators`. The sandbox was standard-only and did not prove dual-mode behavior.

### Phase 3: correct `BaseElement`

1. Remove the duplicate `shadowRoot` declaration.
2. Use the local `attachShadow` result.
3. Keep binding methods on `HelperUtils.fetchOrCreate`.
4. Update comments so they describe standard class metadata rather than prototype Reflect metadata.

### Phase 4: switch the toolchain

1. Upgrade `@swc/core` before enabling the transform.
2. Add one shared SWC decorator plugin factory.
3. Add it to Vite and Vitest configs that compile annotated code.
4. Remove every `oxc.decorator.legacy: true` block.
5. Remove `experimentalDecorators` and `emitDecoratorMetadata`.
6. Add `ESNext.Decorators` where standard metadata types are used.
7. Regenerate the lockfile in the same change.

### Phase 5: migrate consumers and verify distribution

1. Rebuild `dota-event`, then `dota-core`, then `dota-router`, then `dota-wrap` so downstream type checks see standard declarations.
2. Convert `WithLoading` and search again for app-owned decorators.
3. Run all 1,062 tests and all 13 builds from a clean install.
4. Run real-browser component, routing, property, and application-event smoke tests.
5. Exercise dev/HMR source add, change, and removal.
6. Pack the published packages and test ESM and CJS consumers.
7. Inspect emitted output for legacy helpers and design metadata.

## Acceptance checklist

The repository migration should not be called complete until all of these are true:

- [ ] no `tsconfig` enables `experimentalDecorators`;
- [ ] no `tsconfig` enables `emitDecoratorMetadata`;
- [ ] no Vite or Vitest config enables Oxc legacy decorators;
- [ ] the standard transform uses an SWC version that implements `2023-11` decorators;
- [ ] `Symbol.metadata` exists before any decorated class is evaluated;
- [ ] base, child, and sibling metadata do not leak;
- [ ] `observedAttributes` exists before `customElements.define`;
- [ ] all public decorators have standard signatures in generated declarations;
- [ ] `BaseElement` does not assign `shadowRoot`;
- [ ] all 1,062 current tests pass;
- [ ] all 13 builds pass;
- [ ] a browser smoke suite passes;
- [ ] Vite dev/HMR behavior passes;
- [ ] packed ESM and CJS consumers pass;
- [ ] the legacy-consumer compatibility policy is documented;
- [ ] the `reflect-metadata` retention or removal decision is explicit.

## Source map for maintainers

- [`dota-core` decorators](../../../packages/libs/dota-core/src/core/decorators/index.ts)
- [`HelperUtils`](../../../packages/libs/dota-core/src/core/utils/HelperUtils.ts)
- [`BaseElement`](../../../packages/libs/dota-core/src/core/elements/base-elements.ts)
- [`PropertyUtils`](../../../packages/libs/dota-core/src/core/utils/PropertyUtils.ts)
- [`OnEvent`](../../../packages/libs/dota-event/src/listener/on-event.decorator.ts)
- [`AutoBind`](../../../packages/libs/dota-event/src/listener/auto-bind.decorator.ts)
- [`Route`](../../../packages/libs/dota-router/src/route.decorator.ts)
- [`RouterUtils`](../../../packages/libs/dota-router/src/RouterUtils.ts)
- [`WithLoading`](../../../packages/apps/dota-web/src/utils/DecoratorUtils.ts)
- [Earlier TypeScript/Vite migration plan](./typescript-6-vite-8-decorator-migration-plan.md)

## Final recommendation

Proceed with the migration as a staged compatibility change, not as a search-and-replace commit.

The sandbox demonstrates that standard decorators can support the current Dota authoring API and pass the complete existing test/build matrix. The safest design is to make `context.metadata` the producer-side store, `Symbol.metadata` the class attachment, `HelperUtils` the consumer-side bridge, and `@Component` the point that finalizes constructor-level web-component data.

Do not begin the repository implementation until the team decides whether one release must support both legacy-compiled and standard-compiled consumers. That decision determines whether the decorators need dual call shapes and how long the Reflect fallback must remain. It does not change the verified standard metadata design described above.
