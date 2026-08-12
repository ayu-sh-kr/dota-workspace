# Building a Useful Breadcrumb With `dota-breadcrumb`

Breadcrumbs answer a small but important navigation question: where am I, and how do I get back to a broader part of the application? A simple row of links works for short paths, but documentation and content systems quickly need current-page semantics, folded middle levels, keyboard access, dark mode, and a way to change the visual language without rewriting the component.

This tutorial introduces `dota-breadcrumb`, a light-DOM Dota UI component designed for those situations. The examples below are live interfaces, so you can inspect the states instead of only reading about them.

## A normal article trail keeps the current page clear

The smallest useful trail has a root, a section, and the current page. Ancestors render as links, while the current page is rendered as text with `aria-current="page"`; this prevents a breadcrumb from offering a link that simply reloads the page you are already reading.

<dota-breadcrumb path='[{"id":"home","label":"Home","href":"/"},{"id":"tutorials","label":"Tutorials","href":"/blogs"},{"id":"component","label":"Breadcrumb patterns"}]' label="Article location"></dota-breadcrumb>

The `path` value is a JSON array when supplied as an HTML attribute. Each item can provide an explicit `id`, a visible `label`, and an optional `href`. If an ID is omitted, the component derives one from the destination or label and repairs duplicates so navigation remains unambiguous.

## Long paths fold the middle without losing context

Real applications often have more hierarchy than a header can display. Set `budget` to the number of visible crumbs and the component keeps both ends of the trail: the root remains a way out, the current page remains visible, and the middle becomes a disclosure menu.

<dota-breadcrumb path='[{"id":"home","label":"Home","href":"/"},{"id":"docs","label":"Documentation","href":"/blogs"},{"id":"guides","label":"Guides","href":"/blogs"},{"id":"components","label":"Components","href":"/blogs"},{"id":"navigation","label":"Navigation","href":"/blogs"},{"id":"current","label":"Breadcrumb patterns"}]' budget="3" label="Documentation location"></dota-breadcrumb>

Activate the ellipsis with a mouse or keyboard. The folded items are still real links, and the disclosure button exposes its state through `aria-expanded`. A fold containing only one hidden item is suppressed by default because the control would cost about as much space as the item it hides.

## A per-instance theme can change every visual slot

The component keeps behavior and presentation separate. The `config` property accepts a JSON object whose slots replace the default classes independently. This example changes the row surface, separators, links, current item, fold control, and revealed menu without changing the path or accessibility structure.

<dota-breadcrumb
  path='[{"id":"home","label":"Home","href":"/"},{"id":"design","label":"Design system","href":"/blogs"},{"id":"patterns","label":"Patterns","href":"/blogs"},{"id":"current","label":"Themed breadcrumb"}]'
  budget="3"
  label="Themed navigation"
  config='{"container":"block min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900","nav":"relative min-w-0","list":"m-0 flex min-w-0 list-none items-center gap-2 overflow-hidden p-0","item":"flex min-w-0 shrink-0 items-center gap-2","crumb":"block max-w-56 truncate rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 no-underline hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700","current":"block max-w-56 truncate rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white","separator":"inline-flex size-4 shrink-0 items-center justify-center leading-none text-indigo-500","separatorIcon":"lucide:slash","separatorIconClass":"!size-3 !p-0","fold":"inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900","menu":"absolute z-10 mt-2 min-w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900","menuItem":"block w-full truncate rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"}'></dota-breadcrumb>

The override is intentionally shallow by slot. You can replace only `current` or `fold`, or supply the complete visual treatment as above. An empty string is also a valid replacement, which is useful when a consuming application owns a slot entirely through its own CSS.

## The punctuation is part of the visual contract too

Separators and fold markers carry rhythm rather than navigation meaning, so they are presentation slots. The default skin uses a fine chevron and a three-dot fold marker, but a product with a different icon grammar can provide Iconify names through `separatorIcon` and `foldIcon`. The component renders both through the shared `dota-icon` element, so sizing and loading stay consistent with the rest of the UI.

<dota-breadcrumb
  path='[{"id":"home","label":"Home","href":"/"},{"id":"workspace","label":"Workspace","href":"/blogs"},{"id":"projects","label":"Projects","href":"/blogs"},{"id":"milestones","label":"Milestones","href":"/blogs"},{"id":"current","label":"Icon override"}]'
  budget="3"
  label="Icon override example"
  config='{"separatorIcon":"lucide:slash","foldIcon":"material-symbols:more-horiz","separator":"inline-flex size-4 shrink-0 items-center justify-center leading-none text-indigo-500","separatorIconClass":"!size-3 !p-0","fold":"inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-2 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300","foldIconClass":"!size-4 !p-0"}'></dota-breadcrumb>

The override changes the icon name, not the machine’s semantics: the separator remains hidden from assistive technology and the fold control keeps its accessible name and expanded state. The slash is intentionally a visual punctuation choice; it does not become a navigation action.

## Think of the component as a machine and a skin

The reference demo separates two responsibilities. This is useful because responsive layout needs measurements, while navigation correctness should be testable without a browser. `BreadcrumbMachine` owns the path and publishes a snapshot; `BreadcrumbComponent` turns that snapshot into the visible light-DOM skin.

```text
router path -> normalize -> machine snapshot -> skin renders
                               |
                               +-> visible crumbs
                               +-> folded crumbs
                               +-> busy / error / pending state
```

The machine removes blank labels, repairs duplicate IDs, derives root/current flags, and keeps the complete path even when only part of it is visible. The skin owns classes, markup, icon fragments, focus restoration, and the responsive budget passed to `fit()`.

## The fold is a stateful control, not a decoration

The fold marker appears only when it saves meaningful space. Opening it reveals the hidden links in an anchored menu, and pressing `Escape` closes it and returns focus to the marker. This gives the compact row a clear keyboard path as well as a mouse target.

The important states are small enough to reason about:

| State | Visible result |
| --- | --- |
| Short path | Every crumb is rendered; no fold control exists. |
| Folded path | Root, fold marker, and current end remain visible. |
| Open fold | Hidden ancestors appear as links in the menu. |
| Pending navigation | The machine records the requested item for the router. |
| Failed navigation | The path stays intact and the target can be retried. |

Keeping these states in the machine prevents a theme override from changing what a user can navigate to. It also makes the behavior suitable for server-rendered pages, client routers, and static article navigation.

## Navigation stays native while the machine remains observable

Clicking an ancestor uses its normal `href`, so the component works with a browser, a server-rendered site, or a router that intercepts links. At the same time, the component emits `dota-breadcrumb:navigate` with the selected ID and machine snapshot for applications that want analytics, pending states, or custom route handling.

The state machine also exposes the operations that a router needs:

| Operation | Purpose |
| --- | --- |
| `set(path)` | Replace the complete trail after a route change or redirect. |
| `fit(budget)` | Recalculate how many crumbs fit in the available row. |
| `openFold()` / `closeFold()` | Control the middle-level disclosure. |
| `settle(revision)` | Confirm a navigation response and truncate to the selected level. |
| `fail(message)` / `retry()` | Keep a failed destination recoverable without losing the original path. |

This separation means a visual theme cannot accidentally change navigation semantics. The row can be replaced or restyled while the machine continues to own normalization, folding, pending requests, and stale-response protection.

## When to use each form

Choose the simplest state that communicates the page hierarchy clearly:

- Use the default trail for short article, settings, or documentation paths.
- Add `budget` for paths that must stay on one line in narrow layouts.
- Increase `fold-min` when a product wants to avoid a disclosure for very small hidden groups.
- Use `config` when the component must match a local surface, brand, or navigation rail.
- Keep the current location as the final item and omit its `href` so assistive technology gets an accurate current-page signal.

## Summary

`dota-breadcrumb` is more than a row of separators. It combines semantic navigation, a tested folding policy, keyboard-friendly disclosure, native link behavior, and independently replaceable visual slots. Start with a small `path`, add a `budget` when space is constrained, and use `config` when the surrounding interface needs a different visual grammar.
