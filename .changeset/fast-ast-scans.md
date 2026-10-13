---
"@ayu-sh-kr/dota-ast-utils": minor
"@ayu-sh-kr/dota-event-map-generator": patch
"@ayu-sh-kr/dota-web-type-json": patch
"@ayu-sh-kr/dota-wrap": patch
---

Speed up source scanning in the Dota Vite plugins. Converting SWC byte spans to source offsets no
longer re-encodes the file from its start on every call, which made scans quadratic in file size.
On Dota Web the event-map scan dropped from about 16s to 0.3s and the web-types scan from 2.5s to
0.3s, cutting the client build from about 22s to 8s. Generated artifacts are unchanged.

- `dota-ast-utils` adds `AstTraversalUtils.findNodesByType()`, which collects several node types
  in one traversal.
- The event-map generator walks each module twice instead of about nine times, and builds payload
  type information only for modules that publish events.
