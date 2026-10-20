---
"@ayu-sh-kr/dota-ui": minor
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-rendering": minor
"@ayu-sh-kr/dota-wrap": minor
---

Prerendered and server-rendered pages keep Dota UI components in place when they hydrate, instead of rebuilding them after first paint.

- `dota-icon`, `dota-accordion`, `dota-button`, `dota-popover`, `dota-breadcrumb`, `scroll-deck`, `d-avatar`, `avatar-wrapper`, `dota-chip`, `dota-alert`, `orb-background`, and `cloud-chamber` render `html` templates, so hydration adopts their server markup.
- `dota-button`, `dota-popover`, `scroll-deck`, `avatar-wrapper`, and `dota-chip` move their authored children into their rendered markup instead of copying them through `innerHTML`. Child elements keep their identity, listeners, and the hydration markers of the template that authored them. The public `content` string field of `dota-button`, `avatar-wrapper`, and `dota-chip` is removed; author the content as children.
- `dota-button` applies `disabled` and `aria-label` after each render. Without an `aria-label`, the inner button has none.
- `orb-background` applies the current theme's glow after hydration.
- Dota Rendering exports `LIGHT_DOM_SLOT_ATTRIBUTE` (`data-dota-slot`), which marks the template element that receives a light-DOM host's authored children. Dota SSR's string adapter places a host's authored children in that element; hosts without one drop them as before.
