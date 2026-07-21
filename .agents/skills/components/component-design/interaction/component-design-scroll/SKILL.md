---
name: component-design-scroll
description: Use when creating or refactoring horizontal snap-scroll components, carousel decks, or slide-based UI in this workspace. Covers mobile-first layout, scroll snap, touch and pointer input that preserves vertical page scrolling, keyboard controls, and concise progress feedback.
---

# Scroll Component Design

Use this skill when building a horizontal snap-scroll component, carousel, or slide deck.
The goal is a component that feels native on touch devices, works with mouse drag, and responds to keyboard input.

## Core Layout Rules

- Make the scroller the primary interaction surface.
- Use `overflow-x: auto` with `scroll-snap-type: x mandatory` when every gesture should settle on a slide.
- Give each slide `min-w-full` and `snap-start`.
- Keep the slide content compact on mobile and expand it only at larger breakpoints.
- Prefer one clear visual hierarchy per slide instead of dense nested panels.

## Mobile First

Mobile must work without special gestures.

- Keep native scrolling whenever possible. If custom pointer dragging is required, apply `touch-action: pan-y` only to the inner scroller so vertical page panning remains available.
- Avoid full-height desktop sidebars or explanatory panels on phones.
- Keep the entire slide readable within a short vertical span.
- If the desktop version needs more detail, use a separate `md` or `lg` layout branch.

## Interaction Rules

- Let touch movement follow native horizontal scrolling and snap to the nearest slide.
- Support mouse grab with pointer capture only when it improves a desktop drag interaction.
- Support `ArrowLeft` and `ArrowRight` on a focusable scroller without trapping focus.
- Make the scroller focusable with `tabindex="0"`.
- Do not prevent default pointer behavior until the interaction has clearly become a horizontal drag.

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
7. Vertical page scrolling still works while the deck is in view.
8. The component still reads clearly when resized.
