---
"@ayu-sh-kr/dota-rendering": minor
---

Export the durable hydration marker format so other emitters, such as Dota SSR's string renderer, produce exactly what `hydrate()` adopts.

- `hydrationIdentity(tagName, strings, scope)` returns the four host attributes (`data-dh-c`, `data-dh-t`, `data-dh-v`, `data-dh-s`); `HYDRATION_IDENTITY_ATTRIBUTES` lists them for clearing.
- `childPartMarkers`, `keyedEntryMarkers`, and `attributePartToken` build the comment and `data-dh-a` formats; `hydrationScope(n)` and `isHydrationScope` define the `h0`, `h1`, … scope shape.
- The template conventions the renderer writes (`COMPONENT_START_MARKER`, `COMPONENT_END_MARKER`, `NODE_INDEX_ATTRIBUTE`, `COMPONENT_ATTRIBUTE`, `DYNAMIC_ATTRIBUTE`) are now public constants.

The renderer itself uses these, so emitted markup is unchanged.
