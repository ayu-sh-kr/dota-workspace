# Initial-route hydration can remount nested components

## Status

Resolved. The Dota SSR initial-route handoff preserves the prerendered route host through
the application's first mount, and the scoped-marker fix below closes the nested-component
remount as well: `data-dh-s` scopes every marker kind (child, keyed, attribute-part) so a
parent's hydration scan can no longer pair its part with a nested custom element's marker.
Verified against `packages/libs/dota-rendering/src/renderer.ts:37,952-953,1023-1030` and
`packages/libs/dota-rendering/test/hydration.test.ts:167-189` — see
[Hydration/SSR lifecycle consistency audit](../audits/hydration-ssr-lifecycle-consistency-audit.md#22-dota-rendering)
finding R2.

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

## Fix shipped

The scoped-marker design landed in commit `28b42b1` (opt-in hydration handoff patch,
`.changeset/four-monkeys-type.md`): every marker kind gets a `data-dh-s` scope attribute,
required by every parser, so a parent's hydration scan never adopts a nested component's
marker. Regenerated static output must carry the scoped markers for this fix to apply;
output produced before this change does not have them.

## Related documentation

- [Hydration/SSR lifecycle consistency audit](../audits/hydration-ssr-lifecycle-consistency-audit.md) —
  the follow-up audit that verified this fix in code and identified the remaining router,
  terminology, and legacy-fallback gaps it doesn't cover.
- [Hydration + SSR overview](../hydration-ssr/README.md)
