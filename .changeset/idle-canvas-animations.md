---
"@ayu-sh-kr/dota-ui": patch
---

The canvas animations (`orb-background`, `cloud-chamber`, `cursor-displacement`) no longer compete with page start-up or draw frames nobody sees.

- Animation starts after the page has loaded and the browser is idle, and pauses while the element is off screen, hidden by a breakpoint, or in a background tab.
- With `prefers-reduced-motion`, one frame is drawn. On a device that cannot keep frames under about 100 ms apart, the last frame stays and the animation stops.
- `cloud-chamber` renders at half resolution and reuses its static blurred layers, which cuts each frame's cost several times with the same look; `vapor-*` attributes behave as before.
