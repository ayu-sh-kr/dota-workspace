---
"@ayu-sh-kr/dota-rendering": patch
"@ayu-sh-kr/dota-runtime": patch
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-core": patch
"@ayu-sh-kr/dota-wrap": patch
"@ayu-sh-kr/dota-ssr": patch
---

Adds a coordinated initial-mount strategy boundary across the Dota rendering
stack. Dota Core now resolves one application-wide `MountStrategy` whenever a
component first associates its rendered output with an element or shadow root.
The default remains the existing client-side `render()` mount, so applications
that do not install a strategy keep their current behavior.

The new public `MountStrategy` contract receives the component host, render
root, and initial `RenderOutput`, then returns the normal `MountResult`. This
allows runtime integrations such as SSR hydration to adopt existing DOM before
the component performs its first client render. A successful adopted mount can
return `hydrated: true`, which Dota Core uses to emit the `HYDRATED` lifecycle
event before `CONNECTED`; ordinary mounts do not emit that event.

The strategy slot is intentionally exclusive. Runtime composition roots can
register their strategy through `setMountStrategy()` before components connect,
and integrations can inspect the active policy with `resolveMountStrategy()`.
Registering a second strategy throws an error instead of silently changing
mount behavior based on plugin registration order. The coordinated rendering,
runtime, router, core, wrap, and SSR package updates keep this contract and its
hydration lifecycle behavior consistent across the public API.
