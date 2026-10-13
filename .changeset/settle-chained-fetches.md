---
"@ayu-sh-kr/dota-ssr": patch
"@ayu-sh-kr/dota-wrap": patch
---

Static generation now waits for content from loaders that chain requests. Settling used a fixed two
passes over pending DOM tasks and fetches, so a page whose fetch started another fetch, or scheduled
DOM work after the last response, could be serialized before that content rendered. Settling now
repeats until a pass finds no request to wait for, up to 25 passes.
