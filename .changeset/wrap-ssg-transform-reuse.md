---
"@ayu-sh-kr/dota-wrap": patch
---

Speed up static generation by reusing Vite's transformed modules across routes. `dota-wrap` bundles
the `dota-ssr` renderer, so this release carries the change already listed for `dota-ssr`. Each
route still runs the application in a fresh window, but no longer re-transforms every module first.
On a 94-route site, prerendering dropped from about 125s to 24s.
