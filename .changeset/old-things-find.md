---
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-wrap": patch
---

Modify the dota-router to let user provide their root component instead of guessing it to be app-root

### Patch Changes
- Modifies dota-router to accept a root component field in its configuration.
- Updates dota-wrap to ensure compatibility with the new root component configuration in dota-router.