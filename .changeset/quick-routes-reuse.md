---
"@ayu-sh-kr/dota-ssr": patch
---

Speed up static generation by reusing Vite's transformed modules across routes. Each route still
runs the application in a fresh window, but no longer re-transforms every module first. On Dota Web,
sequential prerendering of 19 routes dropped from about 41s to 8s.
