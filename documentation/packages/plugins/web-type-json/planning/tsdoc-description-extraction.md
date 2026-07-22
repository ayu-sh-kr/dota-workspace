# TSDoc description extraction

This document specifies how the Web Types plugin can turn existing component TSDoc into IDE descriptions without adding another source scan. It is an implementation plan; TSDoc extraction is not implemented yet.

## Context and intent

The scanner currently reads descriptions only from `description` fields inside `@Component` and `@Property` decorator configuration. It already stores those values in `WebComponentInfo` and `PropertyInfo`, and both the Web Types and Custom Elements Manifest serializers already emit them.

The missing boundary is source documentation extraction. A current `dota-ui` audit found:

- 24 component declarations and 24 adjacent class TSDoc blocks.
- 121 `@Property` declarations but only 8 adjacent property TSDoc blocks.
- A small number of older components describe properties with class-level `@property` tags.
- Most newer components summarize inputs in free-form class paragraphs such as `Inputs:`.

JetBrains Web Types supports descriptions on elements and attributes and supports Markdown description markup. Extracting the existing comments will therefore improve quick documentation without changing component runtime behavior. See the [JetBrains Web Types documentation](https://plugins.jetbrains.com/docs/intellij/polysymbols-web-types.html).

## Required behavior

The scanner should enrich only missing descriptions. Explicit decorator metadata remains authoritative.

| Target | Description precedence |
| --- | --- |
| Component | `@Component({description})` → first paragraph of adjacent class TSDoc → `undefined` |
| Property | `@Property({description})` → adjacent property TSDoc prose → matching class `@property` tag → `undefined` |

Do not parse free-form `Inputs:` paragraphs into individual property descriptions. Natural-language lists do not provide a reliable boundary between properties and guessing would attach incorrect documentation. Components that need property-level IDE help should use adjacent property TSDoc or structured class `@property` tags.

An empty or whitespace-only extracted description should be treated as absent. Documentation extraction must never replace a non-empty decorator description.

## Proposed flow

```text
source text + SWC spans
        │
        ▼
leading TSDoc extraction ──► normalized prose and @property tags
        │
        ▼
decorator-first description resolver
        │
        ▼
WebComponentInfo / PropertyInfo
        ├──► JetBrains Web Types descriptions
        └──► Custom Elements Manifest descriptions
```

The source file must still be read and parsed only once. Parse class documentation once per component, then reuse its structured property-tag map while scanning that class's properties.

## Implementation steps

### 1. Expose documentation anchor offsets

Add `getDeclarationStartOffset(...)` to `ClassView` and `PropertyView` in `dota-ast-utils`. This is separate from `getSourceOffset(...)`: navigation points to the identifier, while documentation association needs the start of the declaration, including its earliest decorator.

The method should:

1. Read the declaration node's `span.start`.
2. Normalize it against the module's `span.start` and local module source offset.
3. Convert SWC's UTF-8 byte distance with `utf8ByteOffsetToSourceOffset`.
4. Return a JavaScript source-string index or `null` for an invalid boundary.

Current SWC output starts decorated class and property spans at the first decorator. Tests must preserve this assumption explicitly because class decorators can span several lines.

Do not reuse the Web Types identifier offset as the documentation anchor and do not subtract raw SWC spans directly. Previous source-offset work established that SWC spans are process-global UTF-8 byte positions, while source strings and IDE offsets use character indexes.

### 2. Add a documentation utility

Create `ComponentDocumentationUtils` under `packages/plugins/web-type-json/src/utils`. Keep it stateless and expose static methods because parsing documentation requires no service lifecycle or mutable cache.

The utility should return a small structured contract:

```ts
export type ComponentDocumentation = {
  description?: string;
  properties: ReadonlyMap<string, string>;
};
```

Provide operations for:

- Finding the nearest leading `/** ... */` block before a declaration anchor.
- Verifying that only whitespace exists between the comment and the first decorator.
- Normalizing comment delimiters, leading `*` characters, CRLF input, common indentation, and surrounding blank lines.
- Preserving paragraph breaks and Markdown such as backticks and lists.
- Selecting the first prose paragraph as the concise component description and separating block tags from prose.
- Reading class-level `@property` and `@prop` tags in common forms:

```text
@property {ButtonColor} color - Selects the visual color token.
@property color Selects the visual color token.
```

Match structured tags against the JavaScript property name first and the configured HTML attribute name second. Ignore malformed tags instead of failing the complete scan.

A lightweight source parser is sufficient for these two outputs and avoids loading the TypeScript compiler or running another AST pass. Use backward `lastIndexOf` boundaries around each declaration anchor rather than a repository-wide regular expression.

### 3. Resolve descriptions during the existing scan

Update `scanWebComponents` in `main.ts` after a component decorator has been identified:

1. Resolve the class declaration start offset.
2. Parse its adjacent TSDoc once.
3. Set the component description from decorator metadata, falling back to the class TSDoc's first paragraph.
4. For each `@Property`, resolve and parse its adjacent TSDoc.
5. Set the property description from decorator metadata, adjacent property prose, or a matching class property tag.
6. Store the resolved strings in the existing `WebComponentInfo.description` and `PropertyInfo.description` fields.

Keep this resolution in the scanner. Serializers should consume shared metadata and must not inspect source text independently, otherwise Web Types and CEM can drift.

No new plugin option is recommended. TSDoc is only a fallback for currently missing values, so enabling it by default enriches output without changing explicit metadata or generation lifecycle behavior.

### 4. Declare Markdown descriptions in Web Types

Add the top-level fields below to `WebTypesSchema` and `createWebTypesSchema`:

```json
{
  "description-markup": "markdown",
  "js-types-syntax": "typescript"
}
```

`description-markup` allows existing backticks, lists, and paragraphs to render as intended. `js-types-syntax` identifies the syntax already used for JavaScript property type text.

CEM descriptions should receive the same normalized text through shared metadata; no CEM schema change is required.

### 5. Preserve deterministic output

Documentation extraction must be a pure function of source text and declaration anchors. Do not include comment offsets, parser spans, timestamps, or filesystem ordering in descriptions.

Repeated builds over unchanged files must remain byte-for-byte stable. The existing component/property sorting policy should remain unchanged.

## Test plan

### AST utility tests

Extend `ClassViewTests.ts` and `PropertyViewTests.ts` with:

- TSDoc before single-line and multiline decorators.
- Decorated declarations after Unicode text, proving byte-to-character conversion.
- Multiple files parsed in one process, proving global SWC spans are normalized.
- Undecorated declarations.
- Invalid span boundaries returning `null`.

### Documentation utility tests

Add `test/utils/ComponentDocumentationUtilsTests.ts` covering:

- One-line and multiline comments.
- Paragraph and Markdown preservation.
- CRLF normalization.
- Removal of comment framing and leading stars.
- First-paragraph summary extraction and prose stopping before block tags.
- Both supported `@property` tag forms.
- Malformed tags, ordinary `/* ... */` comments, detached comments, and empty comments.
- Matching by JavaScript property name and HTML attribute name.

### Scanner and serializer tests

Add source fixtures and integration assertions for:

- Class TSDoc becoming the Web Types element description.
- Adjacent property TSDoc becoming both the HTML attribute and `js.properties` description.
- The same descriptions reaching CEM declarations, members, and attributes.
- Decorator descriptions overriding TSDoc.
- Class `@property` tags supplying a fallback when adjacent property TSDoc is absent.
- Free-form `Inputs:` text not being assigned to individual properties.
- Missing documentation leaving descriptions undefined.
- Repeated generation producing identical output.

Run:

```sh
pnpm --filter @ayu-sh-kr/dota-ast-utils test
pnpm --filter @ayu-sh-kr/dota-web-type-json test
pnpm --filter @ayu-sh-kr/dota-web-type-json build
```

Finally generate `dota-web/web-types.json` and inspect at least `dota-button`, `dota-accordion`, and `orb-background`. These cover class-only prose, adjacent property comments, multiline decorators, and structured attribute documentation.

## Acceptance criteria

- Existing explicit decorator descriptions are unchanged.
- Every documented `dota-ui` component receives an element description in generated Web Types.
- Properties receive descriptions only from adjacent TSDoc or a matching structured class tag.
- HTML attributes and JavaScript properties carry the same resolved property description.
- Web Types and CEM consume one shared description value from scan metadata.
- Source files are still read and parsed once per generation.
- Unicode, repeated scans, multiline decorators, and malformed comments do not corrupt extraction.
- Generated JSON remains deterministic across unchanged builds.

## Related files and documentation

- [`web-type-json/src/main.ts`](../../../../../packages/plugins/web-type-json/src/main.ts)
- [`web-type-json/src/Types.ts`](../../../../../packages/plugins/web-type-json/src/Types.ts)
- [`dota-ast-utils/ClassView.ts`](../../../../../packages/utils/dota-ast-utils/src/view/ClassView.ts)
- [`dota-ast-utils/PropertyView.ts`](../../../../../packages/utils/dota-ast-utils/src/view/PropertyView.ts)
- [`dota-ast-utils/SourceOffsetUtils.ts`](../../../../../packages/utils/dota-ast-utils/src/view/SourceOffsetUtils.ts)
- [`dota-ui/button.component.ts`](../../../../../packages/ui/dota-ui/src/components/button/button.component.ts)
- [`dota-ui/accordion.component.ts`](../../../../../packages/ui/dota-ui/src/components/accordian/accordion.component.ts)
- [Property type IntelliSense](../diagnostics/property-type-intellisense.md)
- [Source offset drift](../diagnostics/source-offset-drift.md)
- [Custom Elements Manifest integration](../custom-elements/custom-elements-manifest-integration.md)
