---
name: component-design-scroll
description: Use when creating or refactoring horizontal snap-scroll components, carousel decks, or slide-based UI in this workspace. Covers mobile-first slides, `touch-action: pan-x`, one-slide-per-gesture behavior, mouse drag, keyboard arrows, compact mobile layouts, and visible slide progress.
---

# Scroll Component Design

Use this skill when building a horizontal snap-scroll component, carousel, or slide deck.
The goal is a component that feels native on touch devices, works with mouse drag, and responds to keyboard input.

## Core Layout Rules

- Make the scroller the primary interaction surface.
- Use `overflow-x-auto` with `scroll-snap-type: x mandatory`.
- Give each slide `min-w-full` and `snap-start`.
- Keep the slide content compact on mobile and expand it only at larger breakpoints.
- Prefer one clear visual hierarchy per slide instead of dense nested panels.

## Mobile First

Mobile must work without special gestures.

- Use `touch-action: pan-x` for horizontal decks.
- Avoid full-height desktop sidebars or explanatory panels on phones.
- Keep the entire slide readable within a short vertical span.
- If the desktop version needs more detail, use a separate `md` or `lg` layout branch.

## Interaction Rules

- Let touch swipe move naturally one slide at a time.
- Support mouse grab with pointer capture when useful.
- Support `ArrowLeft` and `ArrowRight` on a focusable scroller.
- Make the scroller focusable with `tabindex="0"`.
- Keep gesture thresholds small enough that a short drag advances predictably.

## State and Feedback

- Show slide index or progress on each slide.
- If more slides remain, make the indicator visually stronger or glowing.
- Show data transitions, not just labels.
- Prefer `Before -> Transform -> After` or similar state flow if the component teaches a process.

## What To Remove

- Remove decorative titles and framing copy that repeat the slide purpose.
- Remove extra “simulator” language if the slides already explain the process.
- Remove tall two-column desktop content from mobile if it forces long vertical scrolling.
- Remove interactions that block native touch swipe.

## Practical Checklist

Before finishing, verify:

1. Touch swipe works on mobile.
2. Mouse drag works on desktop.
3. Keyboard arrows move one slide.
4. Slides snap cleanly.
5. Mobile uses the compact version.
6. Desktop uses the richer version only when it fits.
7. The component still reads clearly when resized.
