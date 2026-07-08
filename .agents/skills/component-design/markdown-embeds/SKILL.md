---
name: component-design-markdown-embeds
description: Use when embedding a custom component inside markdown/tutorial content in this workspace. Covers when to use raw HTML in markdown, how to keep the component self-contained, where to place the component file, and the registration checks needed for it to render inside dota-web.
---

# Markdown Component Embeds

Use this skill when a markdown document should contain a live custom element instead of a static code block or screenshot.
The component should teach the concept visually while still rendering as normal HTML inside the markdown article.

## Use When

- The markdown needs an interactive or animated example.
- A code block is not enough to explain the behavior.
- The component can be rendered safely as raw HTML inside the markdown pipeline.

## Preferred Pattern

- Create the component under `packages/apps/dota-web/src/components/...`.
- Keep the component self-contained and `shadow: false`.
- Use `HTML` templates and Tailwind classes the same way as other app components.
- Insert the custom tag directly into the markdown file.
- Keep the surrounding markdown short and explanatory.
- If the embedded component scrolls horizontally, apply gesture handling only to the inner scroller, not the page or outer wrapper.

## Markdown Rules

- Use a small intro paragraph before the embedded component.
- Do not wrap the component in unnecessary extra cards or simulator prose if the component already explains the idea.
- Make the component responsive on its own instead of relying on markdown layout tricks.
- Use raw HTML tags directly in markdown when the renderer allows them.
- Never block vertical page scrolling for an embed. If the content is horizontally scrollable, it must still allow the reader to move up and down the blog normally.

## Registration Rules

- If the component lives in `packages/apps/dota-web/src/components`, make sure it is picked up by the app's component discovery.
- If the tag renders as plain HTML, check the selector string first.
- If the component exists but does not upgrade, check whether the app build is including it.
- Do not debug CSS before confirming the component is actually registered.

## Quality Rules

- Keep the embedded component mobile-first.
- Prefer compact slide-style or section-style layouts over tall nested content.
- Show the visual flow, not just text labels.
- Keep any slide index, progress, or state indicator visible but restrained.
- Do not use page-level `touch-action: none`; use a directional touch action only on the inner horizontal scroller when needed.
- Avoid full-height embeds that force the reader to get stuck inside the component on short viewports.

## Debug Checklist

Before finishing, verify:

1. The markdown file renders the custom element tag.
2. The component selector exactly matches the tag name.
3. The component file is inside the app's component scan path.
4. The component is visible in the app build.
5. The embedded component is still readable on mobile.
6. Vertical page scrolling still works when the embed is on screen.
