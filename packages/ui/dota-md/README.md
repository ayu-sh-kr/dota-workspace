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

Renders themed markdown HTML. It updates from the shared `md:render` event (`MDService.render(raw, { publish: true })`) or from `renderMarkdown()`, which renders into that one view only.

**Attributes**

| Attribute       | Default         | Description                                                            |
|-----------------|-----------------|------------------------------------------------------------------------|
| `theme`         | `flat`          | Theme name: a built-in theme or one added with `registerTheme`.        |
| `color`         | `neutral`       | Key of the theme's color map: a Tailwind color or a custom key.        |
| `content-class` | padded wrapper  | Classes for the `[data-md-content]` wrapper; replaces the default layout. |

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

**Customising a view**

Compose `<md-view>` rather than subclassing it. Render into one view with `renderMarkdown()`, and post-process its content from the bubbling `md-rendered` DOM event, whose detail holds the mounted `container` and the render `result`. Images receive `loading="lazy"` automatically.

```ts
import { BindEvent } from '@ayu-sh-kr/dota-core';
import { MD_RENDERED_EVENT, type MdRenderedDetail, type MdViewComponent } from '@ayu-sh-kr/dota-md';

// In the host component that renders <md-view content-class="article-body">
showArticle(markdown: string) {
  this.querySelector<MdViewComponent>('md-view')!.renderMarkdown(markdown);
}

@BindEvent({ event: MD_RENDERED_EVENT, id: 'md-view' })
decorate(event: CustomEvent<MdRenderedDetail>) {
  event.detail.container.querySelector('h1')?.remove();
}
```

`renderMarkdown()` may be called before the view has initialised; the content mounts once it is ready. Prerendered `<md-view>` markup is adopted as initial content instead of being nested.

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

A prerendered `<md-toc>` adopts its entries on hydration, so active-heading tracking works without a new `md:render` event.

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

### Parser, highlighter, and plugins

`MDService.configure()` rebuilds the shared markdown-it instance and clears the cache. Defaults: raw HTML, linkify, typographer, heading anchors, and highlight.js.

```ts
import footnote from 'markdown-it-footnote';
import container from 'markdown-it-container';

MDService.configure({
  options: { breaks: true },                       // markdown-it options
  highlight: (code, lang) => myHighlighter(code, lang), // or `false` to disable highlighting
  plugins: [footnote, [container, 'tip']],          // plugin or [plugin, ...params]
});
```

`createMarkdown(setup)` returns the same configured instance for use outside the service. `MDService.setMd(instance)` accepts any markdown-it instance; the TOC is read from heading `id` attributes, so add `markdown-it-anchor` (as `createMarkdown` does) to keep TOC links working. TOC ids always match the rendered heading ids.

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

### Custom themes

Register a theme to use it by name in `<md-view>`, `<md-toc>`, and `md:theme-change`. `extendTheme` derives one from a base theme, overriding only the tags and color tokens you pass; color keys may be app-specific names such as `primary`.

```ts
import { extendTheme, flatMarkdownTheme, registerTheme } from '@ayu-sh-kr/dota-md';

registerTheme(extendTheme(flatMarkdownTheme, {
  name: 'brand',
  fontFamily: 'var(--brand-font)',
  typography: { pre: 'brand-code-block' },
  color: { primary: { a: { text: 'text-[var(--brand)]' } } },
}));
```

```html
<md-view theme="brand" color="primary"></md-view>
```

`applyMarkdownTheme(html, theme, color)` applies a theme to an HTML string where no DOM exists yet.

---

## Colors

Built-in themes accept any Tailwind color name on the `color` attribute:

`slate` · `gray` · `zinc` · `neutral` · `stone` · `red` · `orange` · `amber` · `yellow` · `lime` · `green` · `emerald` · `teal` · `cyan` · `sky` · `blue` · `indigo` · `violet` · `purple` · `fuchsia` · `pink` · `rose`

---

## License

MIT