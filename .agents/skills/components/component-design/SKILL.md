---
name: component-design
description: Use when designing, refactoring, or placing web components in this workspace. Routes work to the relevant app, library, integration, content, or interaction skill so component contracts, registration, and UX concerns stay separate.
---

# Component Design

Use this as the family entry point. First choose the component's ownership and use case; then read only the matching child skill. Keep shared routing here and specialized implementation rules in the child skills.

## Choose the Scope

| Need | Child skill |
| --- | --- |
| Build a page or local feature component in `packages/apps/dota-web` | `app/dota-web-components/` |
| Place a live component in a markdown or tutorial article | `app/component-design-markdown-embeds/` |
| Build a reusable, themeable component in `packages/ui/dota-ui` | `library/reusable-web-component-design/` |
| Export and activate a `dota-ui` component in `dota-web` | `library/dota-ui-component-registration/` |
| Build a horizontal deck, carousel, or snap scroller | `interaction/component-design-scroll/` |

More than one child skill can apply. For example, a reusable `dota-ui` carousel needs the library, interaction, and registration skills.

## Boundary Rules

- Treat app components as feature composition; do not make them configurable libraries without a reuse case.
- Treat library components as public APIs; preserve behavior and accessibility while allowing deliberate visual configuration.
- Treat registration as integration work, not a styling diagnosis.
- Keep component-specific rules out of this router. Add a child skill only when a concern has a distinct trigger and repeatable guidance.
