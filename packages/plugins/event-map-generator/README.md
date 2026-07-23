# `@ayu-sh-kr/dota-event-map-generator`

Vite plugin scaffold for generating `ApplicationEventMap` declaration files from Dota application sources.

The package supports the common Dota event workflow:

- scan source files for `@OnEvent(...)` handlers
- discover `publish({ name: ... })` event names
- emit a declaration file that augments the application event map module
- optionally emit source-navigation metadata for every published and listened-on event

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

When enabled, the optional location artifact defaults to:

```text
src/event-map.locations.json
```

It contains root-relative source paths, the exact zero-based event-key offset, and the
containing class name and class-identifier offset when the occurrence is inside a class:

```json
{
  "events": [
    {
      "key": "sample:created",
      "published": [],
      "listened": [
        {
          "sourceFile": "./src/sample.ts",
          "offset": 64,
          "className": "SampleFeature",
          "classOffset": 43
        }
      ]
    }
  ]
}
```

## Payload typing

The scanner also recovers payload types syntactically from `publish`, `publishAsync`,
and `emit` calls and uses handler forwarding as a fallback for listener-only events.
Unsupported expressions remain safe incomplete types rather than being evaluated.

## Discovery model

The scaffold is organized around two jobs:

- source scanning in `src/scan/`
- declaration generation in `src/generate/`

The scanner currently looks for:

- `@OnEvent("event:name")`
- `publish({ name: "event:name" })`, `publishAsync(...)`, and `emit(...)`

The declaration generator sorts and merges those observations into typed event entries.
When location output is enabled, repeated occurrences are retained for navigation.

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
- `eventLocations`: optional source-navigation output. Set it to `true` for the default
  path or `{ outFile: 'src/custom-event-locations.json' }` for a custom path.

Example:

```ts
eventMapGenerator({
  eventLocations: {
    outFile: 'src/event-map.locations.json'
  }
})
```

## Development status

The package generates typed event declarations and can optionally emit source-navigation
locations for editor and tooling integrations.
