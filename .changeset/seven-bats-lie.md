---
"@ayu-sh-kr/dota-event-map-generator": patch
"@ayu-sh-kr/dota-ast-utils": patch
"@ayu-sh-kr/dota-md": patch
"@ayu-sh-kr/dota-ui": patch
---

Generate typed application event maps and resolve callable payload return types.

- Event payloads can be recovered from explicitly annotated function, arrow-function, and function-expression returns, including identifier-mediated calls.
- `dota-md` and `dota-ui` now generate package-local event-map declarations during their Vite builds.
- Unsupported inferred or dynamic calls remain safely unresolved instead of inventing payload types.
