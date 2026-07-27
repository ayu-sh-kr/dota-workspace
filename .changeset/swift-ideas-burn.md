---
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-wrap": patch
---

Add optional router-instance global navigation hooks. Applications can register
ordered `beforeEach` guards and `afterEach` observers through
`DotaRouterService.fromComponents()` or `dota-wrap`'s `initializeApp()`; existing
configuration behaves unchanged when the option is omitted.
