---
name: component-design-markdown-embeds
description: Use when embedding a live custom element in Markdown or tutorial content in packages/apps/dota-web. Covers choosing an embed over static content, self-contained responsive design, raw HTML markup, and the checks needed for the element to upgrade.
---

# Markdown Component Embeds

Use this skill when a Markdown document needs an interactive or visual custom element rather than a code block, image, or static explanation. Keep the element self-contained so it works in the article flow without page-level behavior.

## Preferred Pattern

- Create the component under `packages/apps/dota-web/src/components/...`.
- Keep the component self-contained and `shadow: false`.
- Use `HTML` templates and Tailwind classes the same way as other app components.
- Insert the custom tag directly into the markdown file.
- Keep the surrounding markdown short and explanatory.
- Keep interaction and gesture handling inside the embed; never intercept the article's vertical scrolling.

## Markdown Rules

- Use a small intro paragraph before the embedded component.
- Do not wrap the component in unnecessary extra cards or simulator prose if the component already explains the idea.
- Make the component responsive on its own instead of relying on markdown layout tricks.
- Use raw HTML tags directly in Markdown when the renderer allows them.
- Use an ordinary explanatory fallback when the key learning outcome does not require a live interaction.

## Registration Rules

- If the component lives in `packages/apps/dota-web/src/components`, make sure the app includes or discovers it.
- If the tag renders as plain HTML, check the selector string first.
- If the component exists but does not upgrade, check whether the app build is including it.
- Do not debug CSS before confirming the component is actually registered.

## Quality Rules

- Keep the embedded component mobile-first.
- Prefer compact slide-style or section-style layouts over tall nested content.
- Show the visual flow, not just text labels.
- Keep any slide index, progress, or state indicator visible but restrained.
- Do not use page-level `touch-action: none`. Apply any directional touch handling only to the inner interaction surface.
- Avoid full-height embeds that force the reader to get stuck inside the component on short viewports.

## Debug Checklist

Before finishing, verify:

1. The markdown file renders the custom element tag.
2. The component selector exactly matches the tag name.
3. The component file is inside the app's component scan path.
4. The component is visible in the app build.
5. The embedded component is still readable on mobile.
6. Vertical page scrolling still works when the embed is on screen.
