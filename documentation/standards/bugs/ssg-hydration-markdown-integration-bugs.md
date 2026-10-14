# SSG and hydration bugs found while integrating dota-md

Bugs found while making dota-md overridable, prerendering the dota-web docs, and checking the
change against the portfolio and webingo apps (ayu-sh-kr/dota-workspace#128). Each entry records
the symptom, the verified root cause, and either the shipped fix or what remains open. The
findings were checked in Chromium against prerendered (`build:ssg` + `vite preview`) and dev
builds.

## Summary

| # | Area | Bug | Status |
| --- | --- | --- | --- |
| 1 | dota-rendering | Re-mounting a changed template binds attributes to stale nodes | Fixed |
| 2 | dota-ssr | happy-dom teardown crashes when a disconnect callback removes body nodes | Fixed |
| 3 | dota-vite-preloader | Page files with several routes emit duplicate routes | Fixed |
| 4 | dota-md | `<md-view>` lost or nested prerendered content | Fixed |
| 5 | dota-md | `<md-toc>` stopped tracking headings after hydration | Fixed |
| 6 | dota-md | Prerendered theme classes stacked with a restored accent | Fixed |
| 7 | dota-md | Subclasses of `<md-view>` never mounted published content | Fixed |
| 8 | dota-md | TOC ids did not match rendered heading anchors | Fixed |
| 9 | dota-web docs | Server and client first render differed, so hydration rebuilt the reader | Fixed by design |
| 10 | dota-core / dota-event | Decorator metadata is not inherited by subclasses | Open |
| 11 | dota-rendering | A structural update re-mounts the whole template | Open |
| 12 | dota-web | Home page `code-snippet` blocks prerender empty | Open |
| 13 | dota-web content | Live `<counter-component>` in the Reactivity doc re-renders on hydration | Open |

## Fixed

### 1. Re-mounting a changed template binds attributes to stale nodes

**Symptom.** After `updateHTML()` changed a template's structure, for example a conditional part
before a list switching to `nothing`, later list items lost dynamic attributes. In webingo the
second blog TOC link rendered without `href`. In the docs reader, an update after loading
emptied the sidebar, TOC, and pager in the prerendered output.

**Root cause.** Nested `html` templates are composed into one render session, so a structural
change re-mounts the whole template. Each re-mount numbers elements again under the same session
locator prefix. `applyAttribute` treated elements of the fragment being mounted as detached and
resolved them by locator in the live DOM. The outgoing render still held a node with that
locator, and that stale node received the value.

**Fix.** Only elements detached from a live tree are re-resolved; elements still inside the
fragment being mounted are used directly. See `packages/libs/dota-rendering/src/renderer.ts`
(`applyAttribute`). The regression test "re-mounting a changed template" in
`packages/libs/dota-rendering/test/renderer.test.ts` fails without the fix.

### 2. happy-dom teardown crashes when a disconnect callback removes body nodes

**Symptom.** Prerendering `/docs` aborted the whole SSG build with
`TypeError: Cannot read properties of undefined (reading 'Symbol(destroy)')`. The docs pages
could never be prerendered.

**Root cause.** `dota-popover`, used by the old docs theme pickers, removes the panel it portals
into `<body>` from its `disconnectedCallback`. happy-dom's window teardown walks child lists
with a cached length, so the list shrinking mid-walk reads an undefined node.

**Fix.** `closePrerenderWindow` removes body children one at a time, re-reading the list each
time, before closing the window. See `packages/libs/dota-ssr/src/ssg/prerender-runtime.ts` and
`packages/libs/dota-ssr/test/ssg/prerender-runtime.test.ts`; the second test there reproduces
the happy-dom failure, so it will flag when an upgrade makes the workaround unnecessary.

### 3. Page files with several routes emit duplicate routes

**Symptom.** `docs.page.ts` declares `/docs` and `/docs/:slug`. SSG failed with
`Duplicate SSG route: /docs`.

**Root cause.** Route discovery scanned a `.page.ts` file once per component it declares, and each
scan returned every route in the file.

**Fix.** Page files are de-duplicated before scanning. See
`packages/plugins/dota-vite-preloader/src/domain/route-candidate.domain.ts` and the
"scans a page file once" test.

### 4. `<md-view>` lost or nested prerendered content

**Symptom.** In SSG, authored fallback content inside `<md-view>` was lost. On hydration, a
prerendered view captured its whole wrapper as content and rendered it inside a second wrapper.

**Root cause.** The content was captured in the constructor. During happy-dom upgrades, a custom
element's children are not yet visible in its constructor; browsers expose them. The capture
also took the entire `innerHTML`, including the prerendered `[data-md-content]` wrapper.

**Fix.** `<md-view>` captures in `connectedCallback` and adopts the children of a prerendered
`[data-md-content]` wrapper. See `packages/ui/dota-md/src/components/md-view.component.ts`;
covered by "adopts a prerendered wrapper instead of nesting it".

### 5. `<md-toc>` stopped tracking headings after hydration

**Symptom.** On prerendered blog and docs pages the TOC was visible, but the active heading never
changed while scrolling.

**Root cause.** `<md-toc>` only learned its entries from an `md:render` event. A hydrated page
publishes none, so the component's entry list was empty and scroll tracking returned early.

**Fix.** `<md-toc>` rebuilds its entries from the prerendered list before the first mount
(`TocUtils.readEntries`). Covered by `packages/ui/dota-md/test/md-toc.component.test.ts`.

### 6. Prerendered theme classes stacked with a restored accent

**Symptom.** After a saved accent was restored on a prerendered docs page, paragraphs carried
both `text-indigo-900` and `text-rose-950`.

**Root cause.** In-place theming removes only the classes it recorded for each element. Classes
serialized into prerendered markup were never recorded, so they stayed. Inline code with old
theme classes also looked like highlighted code and was skipped.

**Fix.** `<md-view>` records the theme and color it was serialized with, and
`applyMarkdownThemeToElement` removes those classes on the first theming. Covered by
"replaces the serialized theme classes when another color is applied".

### 7. Subclasses of `<md-view>` never mounted published content

**Symptom.** With the new dota-md, the unmodified portfolio's prerendered blog, news, and legal
pages lost their Markdown (31 internal links fewer in the link check).

**Root cause.** The new view used `@AfterInit` to mark itself ready. Decorator metadata is keyed
by the concrete class (bug 10), so the hook never ran for subclasses and their content was never
flushed.

**Fix.** `<md-view>` overrides `handleAfterInit()` and `disconnectedCallback()` instead. Both are
plain methods that subclasses inherit. Covered by "still re-render published content through an
overridden render()".

### 8. TOC ids did not match rendered heading anchors

**Symptom.** 18 of 118 TOC links in the dota-web docs pointed at ids that did not exist. Webingo
carried a wrapper that rewrote TOC ids to work around it.

**Root cause.** The TOC plugin derived ids with its own slug function, while `markdown-it-anchor`
percent-encodes punctuation in heading ids.

**Fix.** The TOC is read from the parsed heading tokens that the anchor plugin already decorated,
so ids always match. `markdown-it-toc-done-right` is removed. See
`packages/ui/dota-md/src/services/md.service.ts`.

### 9. Server and client first render differed, so hydration rebuilt the reader

**Symptom.** On prerendered docs pages, hydration logged `Hydration mismatch on <docs-view>`, then
showed an empty article and TOC without fetching anything.

**Root cause.** The client's first render did not match the serialized HTML, so the recovery
re-rendered `docs-view` and recreated `<md-view>` and `<md-toc>` empty. Two variants occurred:

- the skeleton was authored inside `<md-view>`, so the server's adopted content and the client
  template disagreed;
- a `loading` flag was rendered as `true` during prerender and `false` on the client. The
  skeleton had been removed by direct DOM mutation after the last server render, so the markers
  described a template the client never rendered.

A stateful child inside a conditional sub-template is adopted correctly when the templates match.
That was verified, so the cause is the mismatch, not the nesting.

**Fix.** The reader renders an identical template in both environments. The skeleton is always in
the template and hidden by CSS (`group-has-[[data-md-content]>*]/article:hidden`) once
`<md-view>` holds content. See `packages/apps/dota-web/src/components/docs/docs-view.component.ts`.

## Open

### 10. Decorator metadata is not inherited by subclasses

`HelperUtils.fetchOrCreate` keys metadata by `target.constructor.name`, and `@OnEvent` reads it
with `Reflect.getOwnMetadata`. A subclass therefore loses its parent's `@Property`, `@OnEvent`,
`@AfterInit`, `@BindEvent`, and similar declarations. That is why every consumer of dota-md
redeclared `theme`, `color`, and the `md:render` handler. dota-md now avoids subclassing, but
any base component with decorators has the same trap.

**Recommended fix:** resolve metadata along the prototype chain in dota-core and dota-event, and
merge parent and child entries with the child taking precedence.

### 11. A structural update re-mounts the whole template

Because nested templates are inlined into one session, changing which branch a conditional
renders re-mounts every node of the component (bug 1 shows the renumbered indexes). Stateful
children such as `<md-view>` are recreated empty, and focus or scroll state inside them is lost.
The docs reader avoids the problem by never changing its template structure.

**Recommended fix:** give conditional and keyed child templates their own render sessions so a
branch change only replaces that range.

### 12. Home page `code-snippet` blocks prerender empty

`code-snippet` reads its source from `textContent` in the constructor. That fails in happy-dom
(see bug 4), so the prerendered home page contains empty code blocks. After hydration the
constructor reads the empty server output instead of the authored code. The same result is
visible in the build before this work.

**Recommended fix:** pass the code through an attribute or a `<template>` child, read it in
`connectedCallback`, and render the highlighted HTML during prerender rather than in `@AfterInit`
alone.

### 13. Live `<counter-component>` in the Reactivity doc re-renders on hydration

The Reactivity Markdown embeds `<counter-component>` as live HTML. On prerendered pages it logs
`Missing hydration markers for part p0` and re-renders itself. The docs layout is unaffected;
the demo component's prerendered markup should be checked against its client template.

## Rules for hydration-safe components

- Capture authored children in `connectedCallback`, not the constructor.
- Render the same template on the server and on the client's first render. Derive loading or
  empty states from adopted DOM or CSS, not from state that differs between the two.
- Do not mutate rendered DOM after the last server render unless the client's first render
  reproduces the result.
- Prefer composition over subclassing decorated components until bug 10 is fixed.
- Avoid structural template changes in components that host stateful children until bug 11 is
  fixed.

## Related documentation

- [Initial-route hydration can remount nested components](./dota-hydration-initial-route-bug.md)
- [Hydration/SSR lifecycle consistency audit](../audits/hydration-ssr-lifecycle-consistency-audit.md)
- [Hydration + SSR overview](../hydration-ssr/README.md)
