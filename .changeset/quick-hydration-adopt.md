---
"@ayu-sh-kr/dota-rendering": patch
---

Hydration keeps more server DOM and does less work on first load.

- Attribute parts adopted during hydration now keep updating when a nested light-DOM component re-renders the element that carries them.
- A string-rendering component whose server markup already matches its output keeps the existing nodes instead of rewriting them.
- Repeated mounts of the same template reuse one parse, and adoption matches attribute markers in linear time.
