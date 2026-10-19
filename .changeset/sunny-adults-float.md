---
"@ayu-sh-kr/dota-preloader-plugin": patch
"@ayu-sh-kr/dota-wrap": patch
---

Builds that use `lazyComponents` no longer print an `INEFFECTIVE_DYNAMIC_IMPORT` warning for the root component and every routed page.

- `virtual:dota-component-registry` has a loader for every component, including the ones the entry already imports through `modules` and `virtual:dota-routes`. Those loaders return the already-loaded class, so the warning needed no action.
- The preloader drops the warning only when the registry is the module's sole dynamic importer. A module that application code also imports dynamically still reports it.
