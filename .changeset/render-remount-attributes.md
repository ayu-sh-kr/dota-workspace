---
"@ayu-sh-kr/dota-rendering": patch
---

Re-rendering a template whose structure changed, for example when a conditional part before a list switches to `nothing`, now applies attribute values to the newly mounted elements. Previously a node from the outgoing render that shared a part locator could receive the value, leaving list items without their attributes.
