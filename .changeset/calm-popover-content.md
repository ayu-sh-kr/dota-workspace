---
"@ayu-sh-kr/dota-ui": patch
---

Light-DOM components now read their authored content when they connect instead of in their constructor, so static generation keeps their content and pages using them hydrate without a mismatch.

- Affects `dota-popover`, `dota-badge`, `dota-button`, `dota-chip`, `dota-card`, the card footer, `dota-avatar`, `dota-slide`, `scroll-deck`, and `dota-carousel`.
- `dota-carousel` keeps slides assigned through `dotaSlides` when no `<dota-slide>` children are authored.
