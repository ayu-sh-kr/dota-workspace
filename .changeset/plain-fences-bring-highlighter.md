---
"@ayu-sh-kr/dota-md": minor
---

`dota-md` no longer bundles highlight.js. The application now provides its own highlighter, so it bundles only the library and languages it uses. The published module is about 75% smaller (1.77 MB → 445 KB).

- By default, fenced code renders escaped, as `<pre><code class="language-…">`, without highlighting. `highlight: false` is still accepted and behaves the same way.
- `MDService.configure({ highlight })` and `createMarkdown({ highlight })` accept any highlighter function, as before.
- A markdown-it highlighting plugin can be passed through `plugins`.
- The `markdown-it-highlightjs` dependency is removed.

To keep the previous highlight.js output, install `highlight.js` and `markdown-it-highlightjs`, register the languages you need, and configure the service before the first render:

```ts
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import highlightjs from 'markdown-it-highlightjs/core';

hljs.registerLanguage('typescript', typescript);
MDService.configure({ plugins: [[highlightjs, { hljs, auto: true, code: true }]] });
```
