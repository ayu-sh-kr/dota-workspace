---
"@ayu-sh-kr/dota-rendering": patch
---

Hydration now writes attribute and text values that differ from the server markup. Previously,
when a component's first browser render produced a different value than the prerendered HTML
(for example, state read only in the browser, such as the current theme), the server value stayed
on the page and later updates to that same value were skipped, because they compared against the
browser render. Matching markup is adopted unchanged, as before.
