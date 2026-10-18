---
"@ayu-sh-kr/dota-ssr": patch
---

The string renderer now uses Dota Rendering's `/server` entry for template serialization and HTML tokenizing, and `@ayu-sh-kr/dota-server-dom` for its server DOM and request-scoped browser globals. `@ayu-sh-kr/dota-ssr/server` still exports `serializeOutput`, `escapeHtml`, `runInBrowserScope`, `ServerElement`, `ServerShadowRoot`, `ServerDocument`, and `ServerCustomElementRegistry`, so no import changes are needed. Output is unchanged.
