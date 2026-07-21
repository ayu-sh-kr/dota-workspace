---
name: reusable-web-component-design
description: Use when creating or refactoring reusable Dota UI web components in packages/ui/dota-ui. Covers a stable public behavior contract, typed visual configuration, accessibility, animation-safe structure, Tailwind build constraints, and package-consumer validation.
---

# Reusable Web Component Design

Design library components as a stable behavior engine with replaceable visual tokens. Apply this skill to reusable Custom Elements, not page-only composition components. Use `dota-web-components` for app-owned feature UI and `dota-ui-component-registration` when wiring the completed component into the app.

## Inspect Before Designing

Read the component, its config file, stylesheet, exports, and at least one real consumer. Use existing patterns as references:

- `components/accordian/` for a per-instance style configuration and animated disclosure behavior.
- `components/icon/` for shared color, size, and variant tokens sourced from `UIConfig`.
- `components/button/` for structured size, color, shape, and animation configuration.

Also confirm the component is exported through the UI barrels and registered by consuming applications when it is used outside `dota-ui`.

## Separate the Contracts

Keep these responsibilities distinct:

| Contract | Owns | Must not be changed by a theme |
| --- | --- | --- |
| Behavior | state, events, fetches, ARIA state, emitted events, lifecycle work | event flow and accessibility semantics |
| Structure | the elements that make behavior and accessibility work | required buttons, regions, labels, and animation wrappers |
| Presentation | class strings, tokens, size/color/variant choices | the behavioral or structural contract |

Do not add one-off `*-class` properties for every internal node. When consumers need to theme a whole component, expose a single typed config with named visual slots.

## Style Configuration Pattern

Publish a default style object and a matching override type. Make the override shallow by slot, so a consumer can replace only what it owns.

```ts
export const WidgetStyle = {
  container: "...",
  button: {
    base: "...",
    size: { md: "...", lg: "..." },
    color: { purple: { solid: "..." } },
  },
  content: "...",
};

export interface WidgetStyleConfig {
  container?: string;
  button?: {
    base?: string;
    size?: Partial<Record<WidgetSize, string>>;
    color?: Partial<Record<WidgetColor, Partial<Record<WidgetVariant, string>>>>;
  };
  content?: string;
}
```

Resolve each slot independently with `override?.slot ?? WidgetStyle.slot`. Do not shallow-spread nested objects: it can erase default sibling variants unexpectedly. Treat an explicit empty string as a valid replacement by using nullish fallback, not truthiness fallback.

Use an object `@Property` for per-instance configurations. In HTML-string templates, serialize it deliberately:

```ts
config='${JSON.stringify(MY_WIDGET_STYLE)}'
```

Keep JSON values serializable. Escape or reject untrusted content before placing it in an HTML attribute or HTML-string template.

## Keep Animation Machinery Style-Neutral

Style changes must not add click-time layout work. A component should transition one intentional property and let themes supply static classes.

For collapsible content, use a grid-row transition with an overflow-clipped inner wrapper:

```html
<div class="description">
  <div class="content-wrapper"><p class="configured-content">...</p></div>
</div>
```

```css
.description { display: grid; min-height: 0; grid-template-rows: 0fr; overflow: hidden; }
.description-active { grid-template-rows: 1fr; }
.description > .content-wrapper { min-height: 0; overflow: hidden; }
```

Do not toggle padding, font size, or unrelated classes during the same interaction. Keep configured padding on the clipped descendant from the initial render; this prevents visible collapsed spacing and avoids a second layout transition. Respect `prefers-reduced-motion` when adding non-trivial movement.

## Accessibility and Public API

Use native controls where possible. Keep focus-visible treatment in the default style or require it in documented theme slots. For disclosure components, update `aria-expanded` and the controlled region's `aria-hidden` with the visible state.

Generate instance-unique IDs whenever `aria-controls`, `aria-labelledby`, or `aria-describedby` refers to internal light-DOM elements; repeated fixed IDs are invalid once multiple component instances render. Preserve accessible names and keyboard behavior when replacing visual styles.

Document every `@Property` as an attribute-level API, including defaults and fallback behavior. Keep implementation-only state private and do not expose DOM-layout details as public configuration.

## Tailwind and Build Constraints

Tailwind emits only class names it can find in scanned source. Keep default and application theme class strings statically discoverable; runtime-generated utility names will not be emitted. If a library accepts arbitrary consumer classes, document that the consumer's build must include those class strings in its content scan or safelist.

When changing a component that is consumed from `@ayu-sh-kr/dota-ui`:

1. Export it from the component and package barrels.
2. Register it in the app's `externalComponents` when required.
3. Build `dota-ui` before building the consuming app.
4. Verify a default instance and a fully themed instance, including keyboard focus, dark mode, and repeated instances.

Use `$web-component-documentation` for the component contract and `$code-documentation` for non-trivial support functions as well as event policies. Helpers that normalize inputs, select visual tokens, render animation frames, register listeners, or return cleanup functions are part of the reusable component's maintenance contract. Trivial one-line accessors and direct arithmetic helpers may remain undocumented.
