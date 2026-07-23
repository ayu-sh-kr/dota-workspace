# `@ayu-sh-kr/dota-event-map-generator`

Vite plugin scaffold for generating `ApplicationEventMap` declaration files from Dota application sources.

The package is set up to support the common Dota event workflow:

- scan source files for `@OnEvent(...)` handlers
- discover `publish({ name: ... })` event names
- emit a declaration file that augments the application event map module

## Output

By default the plugin writes:

```ts
src/event-map.d.ts
```

The generated file contains a module augmentation for:

```ts
@ayu-sh-kr/dota-wrap/event
```

You can override the output path and module specifier through the plugin options.

## Payload typing

The current generator discovers event names, but it does not infer the payload type
carried by each event. That is why the generated declarations use `unknown`.

If you want the generator itself to emit richer types, extend
`EventMapDeclarationUtils.createDeclaration()` so it can resolve a payload type for
each event name before writing the interface body.

Practical implementation paths:

- inspect `@OnEvent(...)` handlers and read the decorated method parameter type
- inspect `publish({ name, data })` call sites and derive the type of `data`
- maintain a separate manual augmentation file for concrete payload types, and
  keep the generated file as the discovery layer only

## Discovery model

The scaffold is organized around two jobs:

- source scanning in `src/scan/`
- declaration generation in `src/generate/`

The scanner currently looks for:

- `@OnEvent("event:name")`
- `publish({ name: "event:name" })`

Those event names are deduplicated and emitted as `unknown` payload entries. The package is ready for richer payload inference later.

## Plugin hooks

The factory wires the standard Vite hooks needed for development:

- `configResolved()` to honor Vite’s resolved root
- `buildStart()` to generate the declaration file eagerly
- `configureServer()` to regenerate on source changes

## Configuration

```ts
import eventMapGenerator from '@ayu-sh-kr/dota-event-map-generator';

export default defineConfig({
  plugins: [
    eventMapGenerator({
      root: process.cwd(),
      outFile: 'src/event-map.d.ts',
      moduleSpecifier: '@ayu-sh-kr/dota-wrap/event'
    })
  ]
});
```

Options:

- `root`: explicit package root. Defaults to Vite’s resolved root.
- `outFile`: declaration file written relative to `root`.
- `scanRoots`: additional roots to scan alongside `root`.
- `moduleSpecifier`: module augmented by the generated declaration.
- `logType`: consola log level.

## Development status

This package is scaffolded for plugin development. The directory structure, TypeScript config, Vite library build, and Vitest setup are in place so implementation work can start immediately.
