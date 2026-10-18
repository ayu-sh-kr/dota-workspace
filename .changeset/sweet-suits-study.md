---
"@ayu-sh-kr/dota-ui": minor
---

Persist sanitized icons in browser storage for seven days so hard refreshes reuse downloaded SVGs. Failed refreshes retain stale icons and apply a retry cooldown, including across page reloads. Storage failures fall back to memory caching.

Applications can set `IconsComponent.baseUrl` before initialization to serve icons from a same-origin asset directory instead of the public Iconify API.
