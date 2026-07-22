# Custom Elements Manifest generation

`@ayu-sh-kr/dota-web-type-json` can generate a standards-based
`custom-elements.json` alongside JetBrains `web-types.json`. Both artifacts come
from one shared SWC scan, so opting into Custom Elements Manifest (CEM) does not
introduce a second source-analysis pass.

CEM generation is optional and disabled by default. Existing plugin configuration
therefore retains its Web Types-only behavior.

## Supported format

The generator emits [Custom Elements Manifest schema 2.1](https://github.com/webcomponents/custom-elements-manifest):

```json
{
  "schemaVersion": "2.1.0",
  "modules": []
}
```

When package registration is enabled, the plugin adds the standard discovery field:

```json
{
  "web-types": "./web-types.json",
  "customElements": "custom-elements.json"
}
```

The official specification recommends `package.json.customElements` so external
tools can locate the manifest without inspecting a package tarball.

References:

- [Custom Elements Manifest specification](https://github.com/webcomponents/custom-elements-manifest)
- [CEM 2.1 JSON Schema](https://github.com/webcomponents/custom-elements-manifest/blob/main/schema.json)
- [CEM 2.1 TypeScript schema](https://github.com/webcomponents/custom-elements-manifest/blob/main/schema.d.ts)

## Enabling generation

Use the Boolean shorthand when the package's published JavaScript paths match its
source layout:

```ts
dotaWebTypeJson({
  root: resolve(__dirname),
  customElementsManifest: true,
});
```

This generates:

- `web-types.json`;
- `custom-elements.json`;
- `package.json.web-types`;
- `package.json.customElements`.

Use object configuration when the output filename or published module layout is
different:

```ts
dotaWebTypeJson({
  root: resolve(__dirname),
  outFile: "web-types.json",
  scanRoots: [resolve(__dirname), resolve(__dirname, "../../ui/dota-ui")],
  customElementsManifest: {
    enabled: true,
    outFile: "custom-elements.json",
    updatePackageJson: true,
    modulePath: (sourceFile, root) => {
      const sourcePath = relative(root, sourceFile).replace(/\\/g, "/");
      return sourcePath.replace(/^src\//, "dist/").replace(/\.ts$/, ".js");
    },
  },
});
```

Object configuration requires `enabled: true`. This makes accidental configuration
objects non-operative and keeps generation explicitly opt-in.

## Configuration reference

```ts
export type CustomElementsManifestConfig = {
  enabled?: boolean;
  outFile?: string;
  updatePackageJson?: boolean;
  modulePath?: (sourceFile: string, root: string) => string;
};

export type WebTypeJsonPluginConfig = {
  root?: string;
  outFile?: string;
  logType?: LogType;
  scanRoots?: string[];
  customElementsManifest?: boolean | CustomElementsManifestConfig;
};
```

| Option | Default | Behavior |
| --- | --- | --- |
| `customElementsManifest` | `false` | Enables CEM with Boolean shorthand or detailed configuration. |
| `enabled` | `false` | Enables an object-form CEM configuration. |
| `outFile` | `custom-elements.json` | Sets the CEM output path relative to `root`. |
| `updatePackageJson` | `true` when enabled | Controls the `package.json.customElements` field. |
| `modulePath` | Root-relative source path with `.ts` changed to `.js` | Maps source files to published JavaScript modules. |

`outFile` must not resolve to the Web Types output file. The generator rejects a
collision before writing either representation to the same path.

## Shared scan architecture

[`scanWebComponents`](../../../../../packages/plugins/web-type-json/src/main.ts) remains
the expensive phase:

1. Discover component and page files across all `scanRoots`.
2. Deduplicate overlapping glob results.
3. Read and parse each discovered source file once.
4. Extract each `@Component` class and its `@Property` fields.
5. Sort the shared metadata deterministically.

The shared metadata preserves:

- component class and tag names;
- direct and local named-export information;
- absolute source ownership and Web Types source offsets;
- superclass name when it is a simple identifier;
- separate HTML attribute and JavaScript property names;
- normalized property type, required state, description when configured, and
  primitive default value.

[`createWebTypesSchema`](../../../../../packages/plugins/web-type-json/src/main.ts) and
[`createCustomElementsManifest`](../../../../../packages/plugins/web-type-json/src/main.ts)
project that same metadata independently. Neither generated JSON file is translated
into the other.

The plugin does not invoke `@custom-elements-manifest/analyzer`. That analyzer has
its own TypeScript scanning and multi-phase analysis pipeline, which would duplicate
the work already performed by the Dota-aware SWC scanner. See the
[analyzer pipeline](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/#how-it-works).

## Property and attribute mapping

The JavaScript field name and HTML attribute name must remain separate. For example:

```ts
@Property({
  name: "is-loader",
  type: Boolean,
})
isLoading: boolean = false;
```

Web Types receives `is-loader` under HTML attributes and `isLoading` under
`js.properties`. CEM records both directions:

```json
{
  "members": [
    {
      "kind": "field",
      "name": "isLoading",
      "attribute": "is-loader",
      "type": { "text": "boolean" },
      "default": "false"
    }
  ],
  "attributes": [
    {
      "name": "is-loader",
      "fieldName": "isLoading",
      "type": { "text": "boolean" },
      "default": "false"
    }
  ]
}
```

The CEM schema has no direct equivalent of Web Types `required`, so the generator
does not add a non-standard CEM field for that value.

## Component and module mapping

Each package-owned source module becomes a `kind: "javascript-module"` entry.
Decorated classes become custom-element class declarations and receive:

- `name` from the TypeScript class;
- `tagName` from `@Component.selector`;
- `customElement: true`;
- public fields and HTML attributes from `@Property`;
- a JavaScript export when the class is directly exported or appears in a local
  named export;
- a `custom-element-definition` export for its registered selector.

The default path mapping converts:

```text
src/components/loader-section.component.ts
```

to:

```text
src/components/loader-section.component.js
```

This is correct only when the published package preserves that layout. Packages
that publish under `dist/`, use `.mjs`, or otherwise restructure output must provide
`modulePath`. Returned paths must be package-relative and cannot be absolute or
contain a `..` segment.

## Multi-root ownership

Web Types may intentionally aggregate several `scanRoots` so an application gets
completion for app-owned and library-owned components. A CEM describes one package,
not that aggregate.

The scanner still analyzes the union once, but CEM includes only components whose
absolute source file is under `root`. External-root metadata continues to appear in
Web Types and is excluded from the package-scoped CEM.

Generate a CEM separately with each publishable package as `root`. Do not map an
external source into the current package through `modulePath`.

## Writes and watcher behavior

After the shared scan:

1. Web Types and CEM objects are built in memory.
2. Enabled JSON files are written concurrently with `Promise.all`.
3. `package.json` is read once.
4. `web-types` and, when enabled, `customElements` are patched together.
5. `package.json` is written once only when a discovery field changed.

This ordering prevents two independent read-modify-write operations from losing one
another's package fields.

The Vite dev-server watcher retains one coalesced refresh promise. Rapid `add`,
`change`, and `unlink` events therefore share one scan and update every enabled
artifact from the same result. Watcher matching applies to every configured scan
root, including external roots used by aggregate Web Types.

## Source metadata limitation

Web Types source metadata uses a local file and byte offset. CEM 2.1 `source` uses an
absolute URL in `href`. These representations are not interchangeable, so the CEM
serializer currently omits `source` rather than writing an invalid local object.

A future repository-URL mapper can add CEM source links without changing the shared
scanner.

## Verification

The plugin test suite covers:

- unchanged Web Types-only behavior when CEM is omitted;
- Boolean and object CEM configuration;
- one glob/scan cycle when both artifacts are enabled;
- official CEM 2.1 JSON Schema validation;
- JavaScript property versus HTML attribute identity;
- primitive default extraction;
- direct and local named exports;
- package registration and `updatePackageJson: false`;
- custom module-path mapping and escaping-path rejection;
- external-root exclusion from CEM;
- watcher regeneration of both artifacts;
- byte-for-byte stability across unchanged builds.

Run the focused verification with:

```sh
pnpm --filter @ayu-sh-kr/dota-web-type-json test
pnpm --filter @ayu-sh-kr/dota-web-type-json build
```

## Related documentation

- [Local-first Web Types DX guidance](../developer-experience/local-first-dx-guidance.md)
- [Property type intellisense](../diagnostics/property-type-intellisense.md)
- [Web-types source offset drift](../diagnostics/source-offset-drift.md)
- [Web-types plugin flow](../architecture/web-type-json-flow.svg)
