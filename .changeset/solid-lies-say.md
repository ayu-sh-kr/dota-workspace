---
"@ayu-sh-kr/dota-router": patch
---

Introduce a coordinator-driven routing pipeline while preserving the existing router service entry point.

- Configure flat route declarations into nested segment trees with static, slug, root, and fallback matching.
- Route History API and Navigation API adapters through dedicated coordinators that run guards, rendering, and lifecycle hooks in transition order.
- Add a shared DOM renderer, typed route matches and navigation results, redirect and cancellation handling, and abort-aware precommit behavior.
- Retain legacy `RouterUtils` APIs for compatibility while marking coordinator-replaced helpers as deprecated.
