---
name: web-component-documentation
description: Use when documenting, reconstructing, or reviewing TypeScript web component classes, especially components built with `@ayu-sh-kr/dota-core` or `@ayu-sh-kr/dota-wrap` utilities. Produce factual class-level TSDoc covering component purpose, public properties, internal state, event reactions, outputs, lifecycle behavior, rendering, and integration contracts; use `$code-documentation` for non-trivial member comments.
---

# Web Component Documentation

Document these classes as web components. `@Component` supplies a custom-element
selector and `BaseElement`/`DotaPageElement` supplies rendering and framework
binding; do not describe them as ordinary TypeScript service classes.

## Gather the component contract

Read the complete class and the decorators, template, base class, and local
consumers needed to establish its observable behavior. Record only facts the
source supports:

- Purpose: the user-facing role and the composition boundary it owns.
- Public inputs: every `@Property`, including its HTML attribute name, type,
  default, whether it affects rendering, and any meaningful constraint.
- Internal state: every `@State`, its initial value, what changes it, and how
  that change affects the rendered component. Do not present it as an attribute.
- Event contract: each relevant event source, decorated handler, and observable
  reaction. Include `@BindEvent`, `@HostListener`, `@WindowListener`,
  `@DocumentListener`, `@OnEvent`, lifecycle decorators, and `@Watcher` where
  present. State whether the handler updates state, re-renders, emits an event,
  navigates, or performs another source-backed effect.
- Outputs and integration: emitted `@Emitter` events, slot or child-component
  expectations, routed-page parameters/SEO, services, and external DOM effects
  when they are meaningful to a consumer.
- Rendering: the major UI states or branches and the prop/state that selects
  them. Mention shadow-DOM choice when it affects styling or integration.

Treat decorator wrappers as framework behavior, not incidental syntax:
`@Property` defines a reactive observed attribute; `@State` defines reactive
internal state; and listener/lifecycle decorators register framework-managed
callbacks. Verify the exact behavior against the installed Dota Core source
when a component relies on it. Do not claim a callback is reactive, cancellable,
or fired in a particular order unless the source establishes that fact.

## Satisfy the base-class contract

Before documenting or editing a Dota component, inspect its base class. `BaseElement`
is abstract and declares a protected constructor plus `abstract render(): string`.
Therefore a concrete custom element must declare a constructor that calls `super()` and
implement `render()`; leave the child abstract only when it intentionally defers that
rendering contract to a further subclass. Do not describe a component as concrete when
it still relies on an unimplemented base-class member.

## Write the class TSDoc

Place one comprehensive `/** ... */` block immediately above the first class
decorator (or immediately above the class when undecorated) so it documents the
whole component declaration. Reconstruct the component's behavior from the
contract gathered above so a maintainer can understand what it does, why it
exists, how it is configured, and how it responds without reading every method.

Use short labelled paragraphs or compact lists inside the comment. Include only
sections that apply, in this order:

1. Component purpose and rendered responsibility.
2. `Inputs:` public properties, with attribute names, defaults, and effects.
3. `State:` internal reactive values and the visible behavior they control.
4. `Events:` incoming event sources and handler reactions, plus emitted outputs.
5. `Lifecycle and integration:` initialization, dependencies, child/slot,
   routing, or styling contracts that matter to usage or maintenance.

Prefer a focused comment over a decorator inventory. Explain relationships—for
example, an attribute changes the selected item, a click updates that state, and
an emitted event informs the parent—rather than listing those facts separately.
Omit empty categories. Keep the documentation close to the class and revise it
whenever props, state, events, or rendering behavior changes.

```ts
/**
 * Lets a user choose the documentation theme and renders the active option.
 *
 * Inputs: `theme` (`theme`, default `"flat"`) selects the initially displayed
 * theme and is reflected whenever the host attribute changes.
 * State: `selectedTheme` tracks the user's current choice and determines which
 * option is marked active.
 * Events: delegated option clicks set `selectedTheme`, notify the application
 * theme channel, and re-render the picker; `@Emitter("theme-change")` exposes
 * the resulting theme to DOM consumers.
 * Lifecycle and integration: uses light DOM so the app's Tailwind theme styles
 * apply to its option elements.
 */
@Component({ selector: "theme-picker", shadow: false })
export class ThemePickerComponent extends BaseElement {
  // ...
}
```

Adapt the example to actual source. Never invent an emitter, a default, an event
name, or an effect merely to fill a section.

## Document members selectively

For individual class members, follow the `$code-documentation` skill. Read its
`SKILL.md` before writing member TSDoc and use its concise purpose, rationale,
parameter, return-value, and failure-mode standard. Add member comments only for
non-trivial public APIs, lifecycle handlers, event handlers whose policy is not
clear from their name, and helpers with a maintenance hazard. Do not duplicate
the class contract on every decorated field or method, and do not comment simple
fields, constructors, or obvious render methods.

## Final review

Confirm that the class TSDoc matches the current decorators and template, every
public input and meaningful state transition is covered, incoming and outgoing
events state their source and effect, framework behavior is distinguished from
component-specific behavior, and member comments follow `$code-documentation`.
