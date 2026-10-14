---
"@ayu-sh-kr/dota-ssr": patch
---

Static generation no longer fails on pages whose components remove other nodes when they disconnect, such as `dota-popover` removing its panel from `<body>`. The rendered tree is now detached before the route window closes, which avoids a happy-dom teardown error that aborted the whole build.
