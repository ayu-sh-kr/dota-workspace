# Web Component property type intellisense

The web-types generator must describe both the HTML attribute value type and the underlying Web Component property type so IDEs can offer type-aware completion.

## Issue

WebStorm could discover custom-element attributes and navigate to their declarations, but it did not provide reliable type information for properties such as `orbit-count` and `orbit-speed` on `<orb-background>`.

## Why it happened

The generator emitted property metadata in this form:

```json
{
  "name": "orbit-count",
  "type": "Number"
}
```

The flat `type` field was not the current Web Types representation for HTML attribute values, and the generated element did not expose its JavaScript properties under `js.properties`. The scanner also preserved decorator constructor names such as `Number` and `String` instead of normalizing primitive names to lowercase Web Types types.

## Fix

The generated metadata now provides both contracts:

```json
{
  "name": "orbit-count",
  "value": { "type": "number" }
}
```

and:

```json
{
  "js": {
    "properties": [
      { "name": "orbit-count", "type": "number" }
    ]
  }
}
```

Primitive decorator types are normalized to lowercase values such as `string`, `number`, and `boolean`. The generated [dota-web web-types artifact](../../../../../packages/apps/dota-web/web-types.json) now contains these forms for `orb-background`.

## Verification

The web-types plugin tests cover HTML value metadata and JavaScript property metadata for Boolean and Number properties. The full `dota-web` build regenerates the artifact successfully.

## Related documentation

- [Web-types source offset drift](source-offset-drift.md)
- [Web-types plugin implementation](../../../../../packages/plugins/web-type-json/src/main.ts)
- [Web-types plugin tests](../../../../../packages/plugins/web-type-json/test/web-types.test.ts)
