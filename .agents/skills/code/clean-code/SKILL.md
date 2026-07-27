---
name: clean-code
description: Use when writing or reviewing TypeScript in this Dota Web portfolio for readable structure, low verbosity, and clear naming. Enforces meaningful methods over trivial 2-3 line private helpers used once, straight-line code over needless indirection, and names that state intent. Part of the code-quality skill group; pair with component-lifecycle and reusable-design.
---

# Clean Code

Optimize for the reader. Code in this repo is TypeScript building custom elements on Dota Core/Dota Wrap; keep it as direct as the framework allows. Prefer fewer, well-named units over a scatter of tiny indirections. Change structure only when it makes behavior easier to verify — never for its own sake.

## Better structure

- Give each function and component one clear job. If a method both loads data and formats markup, split along that seam (see the reusable-design skill for separation of concern).
- Keep the happy path on the left margin. Use early returns and guards instead of nested `if`/`else` pyramids. `BaseElement.updateHTML()` already returns early before init — mirror that guard-first style.
- Keep `render()` pure: build the string from `this` state only. Move data loading, fetches, and event publishing into `@OnEvent("connected", true)` or a service, never into `render()` or the constructor.
- Order a class top-down: decorated fields (`@Property`, `@Param`), constructor, lifecycle handlers, event handlers, then `render()`. Match the ordering already used across `src/components`.
- Keep symmetric setup/teardown adjacent so a reader sees both halves at once.

## Less verbosity

- Do not create a `private` helper for a 2-3 line snippet that is called from only one place. Inline it. A one-caller helper adds a name to learn and a jump to make, without earning reuse. Extract a method only when it is genuinely reused, or when a name materially clarifies a dense block.
- Delete dead code, unused imports, unreachable branches, and commented-out blocks rather than leaving them.
- Prefer expressions over ceremony: `const icon = isDark ? a : b;` beats a mutable `let` with an `if`. Use `?.`, `??`, and template literals instead of manual guards and concatenation.
- Do not add defensive layers the framework already provides (re-checking init state, re-wrapping `@BindEvent` in manual `addEventListener`). Let the decorators do their job.
- Build lists with `data.map(...).join("")` inside the template rather than string accumulation in a loop.
- Say it once. If the same literal or class string appears repeatedly, hoist it to a `const` or token (see the reusable-design skill for duplication).

## Clear naming

- Name by intent and domain, not type or mechanism: `loadShowcase`, not `doFetch`; `pricingTier`, not `data2`.
- Follow the repo's casing grammar: kebab-case selectors and attribute names, camelCase class fields and methods, PascalCase classes with a `Component`/`Page`/`Service` suffix, `SCREAMING_SNAKE_CASE` for event constants (`SHOWCASE_MARKDOWN_SOURCE_EVENT`).
- Name event handlers for what they do, not the event: `toggleTheme`, not `onClick`. Name booleans as predicates: `isDarkMode`, `hasMetric`.
- Keep names honest and current. If behavior changes, rename in the same edit; a stale name is worse than a blunt one.
- Avoid abbreviations that only the author expands (`ctx`, `tmp`, `el2`). One short-lived index `i` in a tight loop is fine.

## When extracting *is* right

Extract a method or unit when at least one holds:

- It is called from more than one place (real reuse — the reusable-design skill governs this).
- It hides genuine complexity behind an intention-revealing name (a gnarly parse, a multi-step transform).
- It isolates a side effect (fetch, publish, storage) from pure rendering so each is testable.

Otherwise, leave the code inline where the reader already is.

## Review checklist

- Does `render()` stay pure and free of I/O?
- Is every `private` helper either reused or clearly earning its name? Inline the rest.
- Do guards/early returns keep nesting shallow?
- Do names state intent and follow the repo's casing grammar?
- Any dead code, unused imports, or stale comments to remove?
- Did `npm run build` pass after the cleanup?