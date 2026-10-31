---
"@ayu-sh-kr/dota-rendering": patch
---

String-rendered components now keep server-rendered DOM that contains other components instead of rebuilding it.

Server markup was only kept when it matched the component's string output exactly, which never holds once nested components have rendered their own content or carry hydration markers. Hydration therefore discarded and repainted whole headers, footers, and lists. The comparison now walks both trees:

- The component's own elements, attributes, text, and `<template>` contents must still match exactly, ignoring `data-dh-*` markers.
- Nested components must carry the tag and attributes the parent gave them. Children the parent gave them must match the host's light DOM (shadow hosts) or the component's own `data-dota-slot` element (light-DOM hosts); when neither holds them, the parent re-renders.
- Any other difference still re-renders.
