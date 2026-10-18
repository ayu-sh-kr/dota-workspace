---
"@ayu-sh-kr/dota-core": minor
---

Pages can publish schema.org structured data through `SEO.jsonLd`, a JSON-LD object or array.

- `updateDocumentSEO` (and therefore `DotaPageElement`) keeps one `<script type="application/ld+json">` in the document head in sync with it, and removes it when a page has no `jsonLd`, so structured data never carries over to the next route.
- The managed script is marked with the new `SEO_JSON_LD_ATTRIBUTE` (`data-dota-seo`). JSON-LD scripts written by the application are left untouched, and server renderers can write the same attribute so the browser updates their script instead of adding a second one.
- `seoHeadTags(seo)` describes every head element page SEO manages (title, meta, link, JSON-LD) in write order, with absent values marking tags to remove; `seoHeadTagSelector(tag)` identifies the element each one manages. `updateDocumentSEO` applies this list, and server renderers serialize the same one, so the head built on the server always matches the browser's.
