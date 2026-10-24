---
"@ayu-sh-kr/dota-ssr": minor
---

Keep one canonical URL per page on every deployment target, with trailing slashes on by default and a new `trailingSlash: false` opt-out.

- `trailingSlash` (default `true`) writes `/docs` to `docs/index.html`, served at `/docs/`. `false` writes `docs.html`, served at `/docs`; Vercel gets `cleanUrls: true`, and redirects generated under the other setting are removed. Explicit route outputs are kept either way.
- Netlify and Cloudflare Pages `_redirects` no longer rewrite canonical outputs with status 200, which served the page at both URLs; the hosts' native slash handling applies. Custom `.html` outputs keep their rewrite.
- The generated Node server redirects (308, query kept) `/docs` to `/docs/` for a directory index and `/docs/` to `/docs` for `docs.html`.
