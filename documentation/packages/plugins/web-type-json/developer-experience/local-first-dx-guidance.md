# Local-first Web Types DX guidance

Web Types should make the local source code discoverable and understandable before a developer needs to search external documentation. The generated metadata should answer four questions from the IDE: what component is this, which attributes and properties exist, what values do they accept, and where can I inspect the implementation?

## Current example

[`loader-section.component.ts`](../../../../../packages/apps/dota-web/src/components/utils/section/loader-section.component.ts) defines the `is-loader` property as a Boolean with a default of `false`.

The generated [`loader-section` metadata](../../../../../packages/apps/dota-web/web-types.json) already exposes the primitive type in both supported locations:

```json
{
  "name": "is-loader",
  "value": { "type": "boolean" },
  "js": {
    "properties": [
      { "name": "is-loader", "type": "boolean" }
    ]
  }
}
```

This supports type-aware completion and source navigation. The default value and human-readable explanation are still useful additions.

## Details worth adding

### Component identity

- `description`: one concise sentence explaining the component’s purpose.
- `doc-url`: a stable local or published documentation URL when a longer guide exists.
- `source`: the source file and class identifier offset for direct navigation.

### Attribute and property behavior

- `description`: explain what the value controls and its unit or semantic meaning.
- `default`: expose the actual runtime default as a string, such as `"false"`, `"14"`, or `"md"`.
- `required`: distinguish required consumer input from optional values with defaults.
- `value.type`: use lowercase primitive types for HTML attribute value completion.
- `js.properties[].type`: describe the corresponding DOM property type for JavaScript and TypeScript usage.
- `source`: point both the attribute and JavaScript property back to the declaration.

For example, `loader-section` could expose:

```json
{
  "name": "is-loader",
  "description": "Shows the full-screen loading overlay when enabled.",
  "default": "false",
  "required": false,
  "value": { "type": "boolean" }
}
```

### Enumerated values

Properties such as `orbit-direction`, `orbit-size`, and `orbit-position` are currently typed as strings even though their TypeScript types restrict them to finite unions. The generator can become more helpful by exposing those allowed values as enum or pattern metadata supported by the target Web Types schema, while keeping `value.type` as `string`.

### Component structure

- `slots`: document named or meaningful content insertion points.
- `events`: document custom events and their payload meaning.
- `js.events`: add JavaScript-facing event metadata when consumers subscribe programmatically.
- Component-level descriptions: explain accessibility behavior, rendering mode, and important lifecycle expectations.

## Recommended authoring flow

1. Add concise JSDoc/TSDoc to the component and its public properties.
2. Keep decorator metadata authoritative for names, primitive types, defaults, and required state.
3. Generate Web Types with HTML `attributes` and JavaScript `js.properties` entries.
4. Preserve source links for the component and every public property.
5. Verify the generated artifact locally before relying on IDE completion.

## Constraints

The Web Types file is generated during the Vite build, so manual edits to `web-types.json` will be overwritten. The generator must preserve lowercase primitive types and emit metadata in the schema locations consumed by JetBrains IDEs.

JetBrains’ current Web Types guidance covers HTML attributes, JavaScript properties, descriptions, defaults, events, slots, and source-discoverable component metadata: [Web Types | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/polysymbols-web-types.html).

## Related documentation

- [Property type intellisense](../diagnostics/property-type-intellisense.md)
- [Web-types source offset drift](../diagnostics/source-offset-drift.md)
- [Web-types plugin flow](../architecture/web-type-json-flow.svg)
