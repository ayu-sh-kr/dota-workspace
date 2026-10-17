---
"@ayu-sh-kr/dota-ssr": minor
---

SSG route autodetection now selects routes whose render mode is `'ssg'`: `mode: 'ssg'`, or the legacy `ssr: true` when `mode` is absent. Routes declared `mode: 'ssr'` or `'csr'` are not prerendered. Prerendering marks the process as a server render, so components declared `@Component({mode: 'csr'})` are written as empty `data-dota-csr` hosts.
