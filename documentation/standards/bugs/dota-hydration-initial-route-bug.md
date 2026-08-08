# Initial-route hydration can remount nested components

## Status

Partially resolved. The Dota SSR initial-route handoff now preserves the prerendered
route host through the application's first mount. Nested structured components can
still remount after startup because durable hydration markers have no component
ownership scope.

## Observed behavior

On a direct static load such as
`/blogs/content/Tutorial/DES.md/`, the browser first displays the prerendered
article. About one second later, Edge reports:

```text
[dota-rendering] hydration mismatch on <blog-view>
Invalid hydration text range for part p2
```

The warning recovery then mounts `blog-view` normally, which causes the visible
reload. This is separate from `RouterUtils.ts`: its route `innerHTML` update is
the ordinary behavior for a real client-side navigation, not the source of this
late local remount.

## Root cause

The renderer emits local part identifiers such as `dh:p2` and `data-dh-a="p2"`.
`NativeRoot.hydrationNodes()` scans all descendants of the component root. A
parent component therefore sees identical identifiers emitted by nested custom
elements, can pair its planned part with a child marker, and fails when the adopted
range does not match its expected value.

```text
SSG nested templates emit local pN markers
→ parent upgrade scans every descendant
→ parent adopts a child pN marker
→ validation fails
→ warn recovery remounts only that parent host
```

Component state reconstruction, comparing initial `innerHTML`, and deferring the
route page host cannot establish marker ownership and were removed as workarounds.

## Retained route fix

`dotaHydration()` captures the marked route before custom-element upgrade, defers
only the application's first root mount, and adopts a matching initial route. This
prevents the root from removing the prerendered route host before the router's
initial transition. It does not change the marker contract for nested components.

## Required fix

Adopt the scoped-marker design in [Scoped hydration marker ownership](../../packages/libs/dota-rendering/planning/scoped-hydration-marker-ownership.md).
Until that is implemented and regenerated static output is deployed, nested
template hydration is not reliable.

## Related documentation

- [Initial route hydration roadmap](../../packages/libs/dota-ssr/planning/initial-route-hydration-roadmap.md)
- [Dota Rendering marker proposal](../../packages/libs/dota-rendering/planning/scoped-hydration-marker-ownership.md)
