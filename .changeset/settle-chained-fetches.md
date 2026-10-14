---
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-wrap": minor
---

Static generation now waits for content from loaders that chain requests, and a page that never
stops loading no longer stalls the build.

- Settling used a fixed two passes over pending DOM tasks and fetches, so a page whose fetch started
  another fetch, or scheduled DOM work after the last response, could be written before that content
  rendered. Settling now repeats until a pass finds no request to wait for.
- New `settleTimeout` option, default 30000 ms. When a route is still loading after that time or 25
  passes, the page is written as rendered so far and the build logs a warning naming the route.
  Before, a page that kept fetching could hang a sequential build indefinitely.
- Once a page is written, its later requests and any responses still in flight never reach it, so
  its handlers cannot run against the next route.
- Prerender `fetch()` responses now arrive in a later event-loop task, as network responses do.
