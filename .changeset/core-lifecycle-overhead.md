---
"@ayu-sh-kr/dota-core": minor
---

Component lifecycle work is cheaper, and moved elements keep their rendered DOM.

- Connecting, disconnecting, and setting properties no longer read `reflect-metadata` on every call or define empty metadata maps on each instance. Mount and property sets are about 25% faster, and teardown about 30% faster. The new `HelperUtils.readMetadata(instance, kind)` gives the same cached, read-only lookup to other code.
- Re-attaching a moved element updates its existing render instead of mounting it again. Input values, focus, and descendant components inside it are preserved, and state changed while it was detached is still rendered.
- `@EventListener` now removes its window and host listeners on disconnect. Previously they leaked and kept firing on detached elements.
