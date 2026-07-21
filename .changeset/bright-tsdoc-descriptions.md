---
"@ayu-sh-kr/dota-web-type-json": patch
"@ayu-sh-kr/dota-ast-utils": patch
"@ayu-sh-kr/dota-core": patch
---

Document the patch release for source documentation support in generated Web Types and Custom Elements Manifest metadata.

The implementation described in `documentation/web-type-json/plugin/tsdoc-description-extraction.md` will:

- Use existing component TSDoc as the fallback description for Web Types elements.
- Use adjacent property TSDoc and structured class-level `@property` tags for property descriptions.
- Preserve decorator-provided descriptions as the authoritative value.
- Keep HTML attributes, JavaScript properties, and CEM members synchronized through the shared scan metadata.
- Reuse the existing single source read and AST parse, with UTF-8-safe declaration anchors from `dota-ast-utils`.
- Preserve Markdown documentation, deterministic generation, and current output behavior when documentation is absent.
- Add coverage for multiline decorators, Unicode source text, malformed comments, description precedence, repeated generation, and Web Types/CEM propagation.
- Treat a present HTML boolean attribute with an empty string value as `true`, while preserving explicit `true` and `false` values and rejecting invalid boolean text.

These are patch-level DX improvements: they enrich IDE documentation and make boolean HTML attribute presence behave correctly without changing component APIs or decorator contracts.
