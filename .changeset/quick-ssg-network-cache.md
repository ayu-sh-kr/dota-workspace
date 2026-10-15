---
"@ayu-sh-kr/dota-ssr": patch
---

Static generation is faster, most of all on small build machines.

- Plain GET requests to other origins, such as Iconify icons, are downloaded once per build and replayed to every route instead of once per route. Pages in one build now see the same response, including error statuses. Requests that send a body or headers, or pass a `Request` object, still reach the network every time.
- Routes reuse the compiled application modules instead of recompiling them for every page. Each route still evaluates the modules afresh against its own window.
- `concurrency` never starts more render workers than the machine has CPUs. Each worker transforms the application separately, so extra workers only competed for the same cores.
