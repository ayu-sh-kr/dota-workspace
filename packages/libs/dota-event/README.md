# dota-event

Lightweight application event primitives used across the monorepo.

This package provides a small publish/subscribe event system and a decorator-based way to bind instance methods as event handlers. It's designed to be simple and easy to use in both apps and libraries inside the workspace.

## Features

- A small `ApplicationEvent` type and handler callback signature.
- `DefaultApplicationEventManager` — a Map/Set-backed manager for event handler storage.
- `DefaultApplicationEventBus` — a singleton event bus (lazy) used to register, unregister and emit events.
- `DefaultApplicationEventPublisher` / `DefaultApplicationEventListener` — lightweight facades for publishing and listening.
- `@OnEvent` decorator and helpers to bind/unbind decorated instance methods to a listener.

## Installation

In this monorepo you can import the package locally. For external usage (when published) replace the import path with the published package name.

Using pnpm (from repo root):

pnpm add @ayu-sh-kr/dota-event

Or (monorepo/local) import directly from the package path in your TypeScript project.

> Note: the examples below use the package-style import path `@ayu-sh-kr/dota-event`. Replace it with your local/monorepo path if necessary.

## Requirements

- TypeScript
- reflect-metadata (used by the `@OnEvent` decorator)
- If using decorators, enable `experimentalDecorators` and `emitDecoratorMetadata` in your `tsconfig.json`.

Install reflect-metadata if you plan to use the decorator helpers:

pnpm add reflect-metadata

and import it once (for example in your app entry):

import 'reflect-metadata';

## Quick API summary

Exports you will typically use:

- Types
  - `ApplicationEvent` — { name: string; data?: any }
  - `ApplicationEventCallback` — (event: ApplicationEvent) => void

- Manager
  - `DefaultApplicationEventManager` — add/remove/resolve/clear

- Bus
  - `DefaultApplicationEventBus` — singleton via `DefaultApplicationEventBus.getInstance()`
    - Note: the bus class implements its `on`, `off`, and `emit` methods as async (`Promise<void>`), so you can `await` those calls. (The public `Types` interface is minimal; prefer checking the class behavior in code.)

- Facades
  - `DefaultApplicationEventPublisher` — `publish(event: ApplicationEvent): void` and `publishAsync(event): Promise<void>`
  - `DefaultApplicationEventListener` — `on(event, callback)` and `off(event, callback)` (delegates to the bus)

- Decorator & helpers (from `on-event.decorator.ts`)
  - `OnEvent(name: string)` — method decorator
  - `getOnEventMetadata(targetOrInstance)` — read metadata
  - `bindInstanceEventHandlers(instance, listener)` — register decorated methods on a listener
  - `unbindInstanceEventHandlers(instance, listener)` — unregister decorated methods from a listener

## DefaultClassApplicationEventBindManager

`DefaultClassApplicationEventBindManager` is the package's class-level helper for managing decorated instance method bindings on a provided `ApplicationEventListener`. It:

- Scans a target instance's `@OnEvent` metadata and binds each method to the listener.
- Keeps an internal store of bound callbacks organized by event name and method key.
- Prevents duplicate registrations: calling `bind()` multiple times will not re-register the same method for the same event because the manager checks the internal store before adding a listener.
- Ensures precise unbinding: `unbind()` uses the stored bound callback references to remove the exact functions from the listener and cleans up empty entries.

This makes it safe for services or components that might initialize or call `bind()` repeatedly (for example during hot-reload or multiple init attempts) without producing duplicate listener invocations.

## Quickstart examples

All snippets are TypeScript and assume the following import path — replace with your project-specific path if needed:

import {
  DefaultApplicationEventBus,
  DefaultApplicationEventPublisher,
  DefaultApplicationEventListener,
  OnEvent,
  bindInstanceEventHandlers,
  unbindInstanceEventHandlers,
  ApplicationEvent
} from '@ayu-sh-kr/dota-event';

### 1) Basic singleton bus (on / emit / off)

```ts
// get the shared bus
const bus = DefaultApplicationEventBus.getInstance();

// register a handler (bus.on is async)
await bus.on('user:created', (event) => {
  console.log('user created:', event.data);
});

// emit an event (emit is async)
await bus.emit({ name: 'user:created', data: { id: 1, name: 'alice' } });

// remove all handlers for an event
await bus.off('user:created', null);
```

### 2) Using the publisher / publishAsync

```ts
const bus = DefaultApplicationEventBus.getInstance();
const publisher = new DefaultApplicationEventPublisher(bus);

// publish synchronously (note: the implementation delegates to the bus emit but the method itself is synchronous)
publisher.publish({ name: 'order:placed', data: { id: 42 } });

// publish asynchronously and await handlers
await publisher.publishAsync({ name: 'order:placed', data: { id: 43 } });
```

> Note: `publish` calls the bus `emit` but does not await it; use `publishAsync` when you need to wait for handlers.

### 3) Decorator-based handlers (class methods)

```ts
import 'reflect-metadata'; // ensure this is imported somewhere in your app

class MyService {
  @OnEvent('payment:received')
  onPayment(event: ApplicationEvent) {
    console.log('payment received', event.data);
  }
}

const instance = new MyService();
const bus = DefaultApplicationEventBus.getInstance();
const listener = new DefaultApplicationEventListener(bus);

// register all decorated handlers from instance onto the listener
await bindInstanceEventHandlers(instance, listener);

// publish — handlers bound above will run
await bus.emit({ name: 'payment:received', data: { amount: 100 } });

// when shutting down or removing the instance
await unbindInstanceEventHandlers(instance, listener);
```

### 4) Advanced: multiple handlers and clearing

```ts
const bus = DefaultApplicationEventBus.getInstance();

await bus.on('metrics:tick', () => console.log('handler A'));
await bus.on('metrics:tick', () => console.log('handler B'));

await bus.emit({ name: 'metrics:tick' });
// -> handler A
// -> handler B

// Remove all handlers for the event
await bus.off('metrics:tick', null);
```