---
"@ayu-sh-kr/dota-ast-utils": minor
"@ayu-sh-kr/dota-event-map-generator": minor
"@ayu-sh-kr/dota-web-type-json": patch
"@ayu-sh-kr/dota-preloader-plugin": patch
"@ayu-sh-kr/dota-wrap": patch
---

Speed up source scanning in the Dota Vite plugins. Converting SWC byte spans to source offsets no
longer re-encodes the file from its start on every call, which made scans quadratic in file size.
The preloader, event-map, and Web Types plugins now also share one parsed-source cache, so each file
is read and parsed once per build instead of up to four times. On Dota Web the client build dropped
from about 22s to 7s. Generated artifacts are unchanged.

- `dota-ast-utils` adds `SourceFileIndex`, a parsed-source cache keyed by path and parser settings
  that reparses a file only when its modification time or size changes, and
  `AstTraversalUtils.findNodesByType()`, which collects several node types in one traversal.
- `scanEventMapSources()` accepts a `sourceIndex` option and parses files concurrently. A read or
  parse failure still rejects the scan, but other files may already have been read.
- The preloader reads sources relative to its configured `root`. Running Vite from a directory
  other than the project root no longer fails with `ENOENT`.
- `dota-web-type-json` and the preloader import `dota-ast-utils` instead of bundling a copy.
