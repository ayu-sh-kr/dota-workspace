# Dota Web UI grammar

Every page in Dota Web is built from the same small set of roles, so pages read as one site. The
home page is the reference. Roles live in `packages/apps/dota-web/public/assets/css/`; components
use them instead of Tailwind palette steps, ad-hoc font sizes, or per-page shadows.

## Type

DM Sans is the only text face (`--font-body`, `--font-display`); Fira Code is used for code. Pick a
role class rather than a `text-*` size:

| Role | Class | Use |
| --- | --- | --- |
| Hero | `type-display` | One per page, home hero only |
| Page title | `type-title` | The `<h1>` of every other page |
| Section title | `type-section` | Section openers and article `<h1>` |
| Card title | `type-card` | Card and block headings |
| Lede | `type-lede` | The sentence under a title |
| Reading | `type-reading` | Long-form prose |
| Compact | `type-compact` | Card descriptions, dense UI |
| Meta | `type-meta` | Authors, read times, helper text |
| Eyebrow | `type-eyebrow` | Uppercase label above a title, in the accent |
| Brand | `type-brand` | The "Dota" wordmark |

## Color

Use the semantic utilities (`text-foreground`, `text-muted`, `text-primary`, `bg-surface`,
`bg-raised`, `border-default`, `border-strong`, `border-primary-border`). They switch with dark
mode, so components need no `dark:` color variants. The accent marks links, eyebrows, and active
states only; headings and body text stay neutral. Pages do not use decorative backgrounds.

## Layout

- Containers: `layout-page` (grids and multi-column pages), `layout-content` (one or two columns),
  `layout-reading` (prose).
- The first section of a page uses `layout-section-page`, which clears the floating header; later
  sections use `layout-section` and `home-section-divider`.
- Grids: `layout-grid-3` for card lists, `layout-card-grid` for four-up rows.
- Page openings use `<section-header eyebrow="…" heading="…" description="…">`; pass `level="2"`
  for a later section on the same page.

## Elements

| Element | Class |
| --- | --- |
| Card | `surface-card`; add `surface-card-link` when the whole card is a link |
| Inset area | `surface-inset` |
| Primary action | `button-primary` (neutral contrast fill, pill) |
| Secondary action | `button-secondary` |
| Text action | `button-link` |
| Icon action | `button-icon` |
| Tag | `chip` |
| Input or select | `field` |
| Code block | `code-panel` |

Radii come from the tokens: pills for actions, `--layout-radius-control` for chips and fields,
`--layout-radius-card` for cards, `--layout-radius-code` for code panels.

## Markdown

Docs, blog articles, and resources render with the `dota` Markdown theme registered in
`src/configs/markdown-theme.config.ts`. It maps headings, prose, and code to the roles above. The
docs theme and accent pickers still offer the `dota-md` presets; each preset also accepts the
`dota` accent.
