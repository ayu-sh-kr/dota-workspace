---
"@ayu-sh-kr/dota-router": minor
---

`@Route` accepts `mode: 'ssr' | 'ssg' | 'csr'` and stores the resolved mode in route metadata and compiled route configs. The existing `ssr: true` flag keeps working and resolves to `'ssg'`; `mode` takes precedence when both are set.
