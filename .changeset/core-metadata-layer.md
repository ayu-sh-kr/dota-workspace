---
"@ayu-sh-kr/dota-core": minor
---

Decorators now store component metadata in a typed metadata layer, so subclasses inherit decorated members and the decorators are ready to move to standard (TC39) decorators.

- `Metadata.for(target)` returns a fluent, cached record for a class, prototype, instance, or standard decorator context. `MetadataKey.value()` and `MetadataKey.map()` create scoped keys, `get` and `has` resolve inheritance, and `own` reads one class only. dota-core's keys are exported as `CoreMetadata`.
- A component that extends another component now inherits its `@Property`, `@State`, `@Watcher`, `@BindEvent`, listener, `@Emitter`, `@Param`, `@Element`, `@Expose`, and init-hook declarations. `observedAttributes` includes inherited attributes, and a subclass no longer adds its attributes to its parent's list.
- `@BeforeInit` and `@AfterInit` run on any method name, base class first. Previously only methods named `beforeViewInit` and `afterViewInit` ran.
- Watchers and init hooks call the instance's method, so a subclass override runs.
- `@BindEvent` only matches elements inside the component. A matching ancestor outside it no longer triggers the handler.
- `@EventListener` is bound by `BaseElement` and only applies to `BaseElement` subclasses.
- `PropertyUtils.unbindWatchers` no longer removes a class's watchers for every instance. It is deprecated and does nothing.
- `HelperUtils.fetchOrCreate` is deprecated in favour of `Metadata.for()`, but it keeps working. The appenders the decorators used (`Property`, `Bind`, `Before`, `After`, `Watcher:<name>`, and so on) return a live view of the metadata layer: reads include inherited entries, and writes reach the class. `HelperUtils.getComponentMetadata(ctor, 'Component')` still works.
- `@Component` no longer stores a list of prototype methods or a `ClassName:shadow` metadata key.

Lifecycle events and hooks keep their previous microtask timing.
