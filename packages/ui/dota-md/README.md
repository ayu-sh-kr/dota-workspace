# @ayu-sh-kr/dota-md

Web component library for rendering Markdown in documentation and blog layouts. Built on `markdown-it` with syntax highlighting, anchor links, and an extracted Table of Contents.

## Installation

```bash
npm install @ayu-sh-kr/dota-md
```

Import the stylesheet alongside the components:

```ts
import '@ayu-sh-kr/dota-md';
import '@ayu-sh-kr/dota-md/dota-md.css';
```

---

## Components

### `<md-view>`

Renders themed markdown HTML. Reacts to events on the shared event bus — no wiring required when used alongside `MDService.render({ publish: true })`.

**Attributes**

| Attribute | Default   | Description                                          |
|-----------|-----------|------------------------------------------------------|
| `theme`   | `flat`    | Theme name (`flat`, `material`, `apple`, `github`).  |
| `color`   | `neutral` | Accent colour — any Tailwind color name.             |

**Usage**

```html
<md-view theme="flat" color="indigo"></md-view>
```

```ts
import { MDService } from '@ayu-sh-kr/dota-md';

const raw = `# Hello\nSome **markdown** content.`;
MDService.render(raw, { publish: true });
// md-view receives the md:render event and updates automatically
```

---

### `<md-toc>`

Sticky Table of Contents sidebar. Highlights the active heading on scroll, smooth-scrolls on click, and stays in sync with theme/colour changes via events.

**Attributes**

| Attribute       | Default        | Description                                              |
|-----------------|----------------|----------------------------------------------------------|
| `theme`         | `flat`         | Theme name.                                              |
| `color`         | `indigo`       | Accent colour.                                           |
| `header-height` | `64`           | Sticky header height in px, used for scroll offset.      |
| `label`         | `On this page` | Text displayed above the TOC list.                       |

**Usage**

```html
<md-toc theme="flat" color="indigo" header-height="64"></md-toc>
```

TOC entries are populated automatically when `MDService.render({ publish: true })` fires. No additional wiring needed.

---

## MDService

Singleton rendering service. Results are cached by content string (LRU, 50 entries by default).

### `MDService.render(content, options?)`

Returns `{ html: string, toc: TocEntry[] }`.

| Option    | Type      | Default | Description                                                 |
|-----------|-----------|---------|-------------------------------------------------------------|
| `publish` | `boolean` | `false` | Fires an `md:render` event so components update themselves. |
| `bust`    | `boolean` | `false` | Discards the cache entry for this content before rendering. |

```ts
const { html, toc } = MDService.render(raw, { publish: true });
```

### `MDService.renderHtml(content, options?)`

Returns the HTML string only. Still writes to cache.

```ts
const html = MDService.renderHtml(raw);
```

### `MDService.renderToc(content, options?)`

Returns the `TocEntry[]` array only. Still writes to cache.

```ts
const toc = MDService.renderToc(raw);
```

### Cache control

```ts
MDService.clearCache();              // clear all
MDService.clearCacheFor(content);   // clear one entry
MDService.setCacheLimit(100);       // adjust max entries (default 50)
```

### Custom markdown-it instance

```ts
import markdownit from 'markdown-it';

MDService.setMd(markdownit().use(myPlugin));
// Clears the cache automatically
```

---

## Events

Components communicate through the application event bus. You can dispatch these events manually to drive the components from outside.

| Event              | Payload                  | Direction            |
|--------------------|--------------------------|----------------------|
| `md:render`        | `{ html, toc }`          | Service → Components |
| `md:theme-change`  | `{ theme: string }`      | App → Components     |
| `md:color-change`  | `{ color: string }`      | App → Components     |

---

## Themes

Built-in themes available via the `theme` attribute:

| Name       | Description                      |
|------------|----------------------------------|
| `flat`     | Clean, minimal, flat styling     |
| `material` | Material Design-inspired         |
| `apple`    | Apple documentation style        |
| `github`   | GitHub Markdown style            |

More themes will be added in future releases.

---

## Colors

Any Tailwind color name is accepted on the `color` attribute:

`slate` · `gray` · `zinc` · `neutral` · `stone` · `red` · `orange` · `amber` · `yellow` · `lime` · `green` · `emerald` · `teal` · `cyan` · `sky` · `blue` · `indigo` · `violet` · `purple` · `fuchsia` · `pink` · `rose`

---

## License

MIT