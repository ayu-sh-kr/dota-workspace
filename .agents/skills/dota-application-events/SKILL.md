---
name: dota-application-events
description: Use when building or refactoring event-driven communication in Dota Wrap applications, especially when one component publishes application-wide state and another reacts with @OnEvent. Covers ApplicationEventService, the shared publisher initialized in main.ts, typed ApplicationEventMap declarations, lifecycle-safe subscriptions, and scoped versus global event channels.
---

# Dota Application Events

Use the application event bus for decoupled, application-wide coordination. Do not use DOM `CustomEvent`s when the producer and consumer are Dota components that should not depend on their DOM relationship.

## Publish and consume

`main.ts` creates the singleton `ApplicationEventService`, exports its publisher, and registers its listener before application components connect. Publish through that shared publisher:

```ts
import {applicationEventPublisher} from "@dota/main.ts";

applicationEventPublisher.publish({
  name: "feature:changed",
  data: {enabled: true},
});
```

Consume in a `BaseElement` with `@OnEvent` from `@ayu-sh-kr/dota-wrap/event`:

```ts
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";

@OnEvent("feature:changed")
handleFeatureChange() {
  this.updateHTML();
}
```

`BaseElement` binds non-scoped `@OnEvent` handlers when the element connects and removes them when it disconnects. Do not manually subscribe in constructors or add duplicate lifecycle subscriptions.

## Keep event payloads typed

When the application directly resolves `@ayu-sh-kr/dota-event`, declare the event payload once beside the feature state:

```ts
declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "feature:changed": {enabled: boolean};
  }
}
```

The shared publisher and listener then infer `data` for that event name.

If the application only exposes the event API through `@ayu-sh-kr/dota-wrap/event`, add the direct event package before using module augmentation; do not declare an augmentation for a module TypeScript cannot resolve.

## Persisted state pattern

When state survives refreshes, persistence is the source of truth:

1. The control writes normalized data to `LocalStorageService`.
2. It publishes an application event with that persisted data.
3. Consumers respond with `@OnEvent`, re-read storage, and call `updateHTML()`.

This prevents stale component fields from winning after a parent re-render or route revisit.

Use `@OnEvent(name, true)` only for a component's private `EventChannel`; global feature events should use the default non-scoped form.
