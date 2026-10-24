---
"@ayu-sh-kr/dota-ssr": patch
---

Keep trailing-slash URLs canonical on every deployment target.

- Netlify and Cloudflare Pages `_redirects` no longer rewrite `/path` to a directory-index page with status 200, which served the page at the slashless URL too; the hosts' native redirect to `/path/` applies instead. Custom `.html` outputs keep their rewrite.
- The generated Node server redirects `/path` to `/path/` (308, query kept) when `/path/index.html` exists, matching Vercel's generated redirects.
