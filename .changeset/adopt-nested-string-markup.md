---
"@ayu-sh-kr/dota-rendering": patch
---

String-rendered components now keep server-rendered DOM that contains other components instead of rebuilding it.

Server markup was only kept when it matched the component's string output exactly, which never holds once nested components have rendered their own content or carry hydration markers. Hydration therefore discarded and repainted whole headers, footers, and lists. The comparison now walks both trees: the component's own elements, attributes, and text must still match exactly (ignoring `data-dh-*` markers), while nested components only need the tag and attributes the parent gave them. Any other difference still re-renders.
