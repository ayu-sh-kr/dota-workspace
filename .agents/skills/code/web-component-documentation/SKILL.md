---
name: web-component-documentation
description: Use when documenting, reconstructing, or reviewing TypeScript web component classes, especially components built with `@ayu-sh-kr/dota-core` or `@ayu-sh-kr/dota-wrap` utilities. Produce factual class- and property-level TSDoc that can become JetBrains Web Types descriptions, defaults, typed HTML values, JavaScript properties, events, and source-linked IDE help; use `$code-documentation` for non-trivial member comments.
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

## Author for Web Types

Write documentation as source material for the generated `web-types.json`, not
only as prose for maintainers. JetBrains Web Types uses HTML attributes for
markup-facing inputs and `js.properties` for the corresponding Web Component
DOM properties; descriptions, defaults, required state, values, and source
locations should agree across both representations. See the [JetBrains Web
Types guidance](https://plugins.jetbrains.com/docs/intellij/polysymbols-web-types.html)
for the supported Web Component contract.

Use these authoring rules:

- Put the component purpose in the first paragraph of the class TSDoc so it can
  become the element `description` without extracting internal implementation detail.
- Put a focused comment immediately above every public `@Property` so it can
  become the matching attribute and `js.properties` `description`.
- State the HTML attribute name, primitive type, default, required status, and
  visible effect in the property comment. Keep decorator metadata authoritative
  for the machine-readable name, type, default, and required value.
- Describe finite string unions as allowed values, for example
  `"flat" | "dark"`; do not call an input merely `string` when the source
  establishes a smaller set of valid values.
- Document units and coercion rules for numbers, presence semantics for boolean
  attributes, and whether a value is reflected between the attribute and DOM property.
- Mention slots, emitted events, event payloads, and important child-component
  relationships at class level so they can become Web Types `slots`, `events`,
  and integration documentation.
- Keep descriptions consumer-facing and stable. Do not put source offsets,
  parser details, private fields, or implementation-only helper names in them.

The current scanner already emits types, defaults supplied by decorator metadata,
required state, and source links. It must explicitly extract TSDoc before class
and property descriptions can appear in generated Web Types; documenting a
component does not by itself change the generated JSON until that extraction
path exists.

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

Keep the first paragraph suitable for an IDE description popup. Put detailed
maintenance context after the consumer-facing summary, and keep property
descriptions close to their declarations so a source-to-Web-Types extractor can
associate each comment with the correct `@Property` node.

```ts
/**
 * Displays a full-screen loading overlay while the host operation is active.
 *
 * @property is-loader - Boolean HTML attribute; presence enables the overlay.
 * Defaults to `false` and affects the rendered visibility of the section.
 */
@Property({name: "is-loader", type: Boolean, default: false})
isLoading = false;
```

## Document members selectively

For individual class members and module-level support functions, follow the `$code-documentation` skill. Read its
`SKILL.md` before writing member TSDoc and use its concise purpose, rationale,
parameter, return-value, and failure-mode standard. Add member comments only for
non-trivial public APIs, lifecycle handlers, event handlers whose policy is not
clear from their name, and helpers with a maintenance hazard. For animation
components, this includes helpers that normalize inputs, resolve palettes or
styles, manage canvas/frame loops, attach global listeners, or return cleanup
functions. Do not duplicate the class contract on every decorated field or
method, and do not comment simple fields, constructors, or obvious render methods.

## Final review

Confirm that the class TSDoc matches the current decorators and template, every
public input and meaningful state transition is covered, incoming and outgoing
events state their source and effect, framework behavior is distinguished from
component-specific behavior, and member comments follow `$code-documentation`.
