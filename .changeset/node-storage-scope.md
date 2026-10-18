---
"@ayu-sh-kr/dota-server-dom": patch
---

Server renders on Node 25 and later now get their own `localStorage` and `sessionStorage`. Node's built-in Web Storage previously stopped the per-request storage from being installed, so `localStorage` was `undefined` and `sessionStorage` was shared across concurrent requests. Node's own storage is restored once the last render ends.
