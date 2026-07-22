# SVG flow diagram vocabulary and design grammar

This is a reusable visual language for technical SVG flow diagrams. It defines how behavior becomes readable nodes, branches, lanes, connectors, annotations, and legends. The [Dota Router HLD](../packages/libs/dota-router/architecture/dota-router-hld.svg) is one application of this grammar, not the scope of the grammar itself.

## Vocabulary

### Behavioral vocabulary

| Term | Meaning |
| --- | --- |
| Entry point | A public call, lifecycle hook, event, request, or other trigger that begins a documented flow. |
| Primary continuation | The normal path that continues toward the main observable result. Keep it on the clearest spine. |
| Process | A step that transforms input, resolves state, invokes a service, or performs implementation work without deciding between outcomes. |
| Decision / guard | A source-backed condition with distinct outcomes. Preserve its code order and label every outcome that changes behavior. |
| Fan-out | One trigger producing independent branches, such as alternative adapters or separate event listeners. Do not draw independent branches as a sequence. |
| Fan-in / convergence | A card or external fork where equivalent paths rejoin before shared work. |
| Early exit | A return, throw, ignored event, no-op, or error response that stops the current path. |
| Fallback | A defined alternate result used when the preferred lookup, match, or operation does not succeed. |
| Effect | A meaningful observable change: a file write, DOM replacement, browser-state mutation, emitted event, response, or persisted state. |
| Terminal outcome | A named end state or handoff. Use a full card when it is important to the reader; use a gray annotation for a trivial stop. |
| Async boundary | A point where work runs later or through a promise/event callback. Show it with a dashed connector only when timing changes the behavior being documented. |
| Source-backed branch | A branch confirmed by current implementation, configuration, or tests. Never add a generic failure branch just because the underlying operation could fail. |

### Visual vocabulary

| Term | Visual meaning |
| --- | --- |
| Entry / trigger card | Blue rounded card. It starts a public API call or event-derived flow. |
| Processing card | Teal rounded card. It performs work without being a branch condition. |
| Decision card | Amber rounded card. It has labeled outcomes and represents a guard or choice. |
| Effect card | Green rounded card. It produces a meaningful browser, DOM, filesystem, state, or response effect. |
| Skip / terminal card | Gray rounded card or gray annotation. It records a stop, log, ignored event, throw, or terminal handoff. |
| Lane | A tinted region grouping one alternative implementation, lifecycle, actor, or event family. Lanes are not automatically sequential. |
| Spine | The clearest vertical or horizontal continuation through the diagram. The spine carries the reader’s default reading order. |
| Annotation | Supporting detail outside a card. It explains parameters, sub-steps, or source behavior but never hides a branch. |
| Corridor | Deliberate empty space reserved for connector turns or cross-lane travel. |
| Port | A card boundary where a connector enters or leaves. Use top/bottom for vertical flow and the side facing a cross-lane source or destination. |
| Branch label | A concise `yes`, `no`, outcome name, or event name placed immediately after its connector leaves the source. |
| Legend | A rendered key showing every color and line style that affects interpretation. |
| Source note | A footer or nearby note naming the implementation files that establish the documented behavior. |

## Design grammar

### Start with behavior

1. Identify every entry point and its inputs.
2. Trace the implementation in execution order.
3. Record guards, early returns, fallbacks, mutations, emitted events, and artifact-producing effects.
4. Separate independent listeners or alternatives into lanes; do not chain them merely because they share a trigger.
5. Collapse implementation-only sub-steps into one process card when they do not change the observable result. Put the detail in an annotation.
6. Draw only branches that are enforced by the source or required to understand a meaningful after-effect.

Before drawing, write a short flow model:

```text
entry → process → decision?
  yes → effect / result
  no  → fallback or terminal outcome
```

### Canvas and hierarchy

- Use a white or transparent canvas. Use light lane backgrounds such as `#f8f9fa`; do not use a solid dark canvas.
- Put entry points at the top or at the left edge, depending on the dominant reading direction.
- Keep the primary continuation on one centered spine whenever possible.
- Use numbered sections or lane labels when the chart has multiple conceptual stages.
- Size the viewBox from measured content, annotations, and footer budget. The example router chart uses `2400 × 3350`, but general diagrams should not inherit that size blindly.
- Use lanes for alternatives or independent flows, then converge them only when the downstream behavior is genuinely shared.

### Node grammar

- Use a rounded card with one short primary label. A single-line card should be at least `40px` high; move long secondary text outside the card.
- Keep card sizes consistent within a lane. Align repeated card centers to a grid.
- A decision’s continuing branch should leave through the bottom or the boundary facing its next step. A terminal or alternate branch should leave through another boundary.
- Never originate `yes` and `no` from the same edge unless they first reach a visible external fork.
- Use a gray annotation instead of a full card for a trivial `return`, `skip`, or log-only stop. Use a named card for a redirect, artifact write, response, or other effect the reader must follow.
- An annotation can clarify a card; it cannot introduce behavior that is absent from the connector graph.

### Color grammar

| Role | Fill | Use |
| --- | --- | --- |
| Entry / trigger | `#3b5bdb` | Public calls, lifecycle events, request starts, and external triggers. |
| Processing | `#0c8599` | Resolution, preparation, orchestration, parsing, lookup, and shared pipeline work. |
| Decision / guard | `#e67700` | Validation, capability checks, cache checks, matching, filtering, and branch conditions. |
| Effect | `#2f9e44` | DOM changes, browser-state changes, file writes, persisted state, emitted results, and successful output. |
| Skip / terminal | `#868e96` | Ignored events, log-and-return paths, throws, empty results, and terminal handoffs. |

Color represents semantic role, not ownership. Use lane backgrounds, labels, or section headings for ownership and implementation identity.

### Connector grammar

- Connectors are `3px`, rounded, orthogonal paths using only horizontal and vertical segments. Never use diagonal flow arrows.
- Use `#495057` solid arrows for synchronous control flow.
- Use `#7048e8` dashed arrows for genuinely asynchronous, promise-based, or post-commit paths. Explain the meaning in the legend.
- Define arrowheads with a `10px` marker and `refX="10"`; end the path exactly on the destination boundary.
- Choose ports before placing annotations. A connector’s direction and destination have priority over secondary text.
- Route cross-lane connectors through empty vertical or horizontal corridors. Verify the corridor does not intersect any card’s bounds or annotation block.
- Let parallel entries merge at one convergence card when all paths feed the same operation. Avoid a decorative fan-out followed by an implied sequence.

### Typography grammar

- Prefer `DM Sans`, then `Poppins`, `Helvetica`, `Arial`, and a generic sans-serif fallback.
- Use at least `15px` for card labels, `14px` for annotations and branch labels, and `13px` for legends/source notes at the source canvas size.
- Use a larger title and section hierarchy, but keep code identifiers in the same legible sans-serif family unless monospace materially improves recognition.
- Center primary labels inside cards. Align annotations to their card or place them in a dedicated note/footer area.
- Do not solve crowded text by shrinking it. Shorten the label, move detail outside the card, enlarge the canvas, or split the diagram.

### Spacing and preflight grammar

- Keep at least `70px` of clear vertical space between connected spine cards; add annotation line height to that budget.
- Keep at least `80px` edge-to-edge clearance between neighboring cards, increasing it when branch labels, markers, or turns share the gap.
- Use one repeated top-to-top pitch for an unbroken stack. Break the rhythm only when a measured branch corridor requires it.
- Place support text at a shared offset below related cards, normally `18–22px` after the card bottom.
- Reserve footer height before drawing the footer. Include every semantic color and line style in a rendered legend.
- Audit markers separately: they must not overlap cards, connectors, bends, arrowheads, or other markers.

### Verification grammar

Before delivery, verify:

- every shown branch exists in the source;
- every meaningful output, state change, and terminal outcome is represented;
- cards do not overlap and no connector crosses a card interior;
- all connectors are orthogonal and terminate on the intended port;
- labels remain readable at the intended preview size;
- the title and description agree with the rendered behavior;
- the legend contains rendered samples for every semantic color and connector style;
- the SVG passes XML validation.

For this repository’s router example, the reusable structural check is:

```bash
kotlinc -script tool-scripts/validate-dota-router-hld.main.kts
```

The browser preview is:

```bash
kotlinc -script tool-scripts/preview-dota-router-hld.main.kts
```

The preview uses the installed Microsoft Edge stable channel by default. Set
`DOTA_ROUTER_PLAYWRIGHT_BROWSER` only when another Playwright browser channel is
intentionally required, for example `chromium` or `msedge-dev`.

## Repository script policy

- Write task and diagram utility scripts as standalone Kotlin Script (`*.main.kts`) files whenever Kotlin Script can perform the work. The `main.kts` suffix selects Kotlin’s built-in executable script definition and improves IntelliJ diagnostics.
- Keep those utilities in the repository-level `tool-scripts/` folder; it is intentionally separate from product code and from `.agents/`.
- Run a script from the workspace root with `kotlinc -script tool-scripts/<name>.main.kts` or an equivalent Kotlin Script runner.
- Use Python or Bash only when Kotlin Script cannot provide the required integration or would make the task materially less reliable. Record that reason beside the script or in the relevant documentation.
- Keep `.agents/` focused on agent skills and their direct resources. Do not place repository task utilities there.

## Applying the grammar to the router example

The Dota Router chart applies the grammar by using configuration assembly as its first section, History and Navigation API implementations as alternative lanes, and `RouterUtils.render()` as the shared convergence and spine. Its exact route checks, prefix recursion, error handling, custom render branch, component metadata branch, and terminal logs are included because each changes the observable result.

The chart itself remains the behavior source for the example: [dota-router-hld.svg](../packages/libs/dota-router/architecture/dota-router-hld.svg). Its implementation claims are grounded in [`DotaRouterService.ts`](../../packages/libs/dota-router/src/DotaRouterService.ts), [`RouterUtils.ts`](../../packages/libs/dota-router/src/RouterUtils.ts), [`dom-history.router.ts`](../../packages/libs/dota-router/src/router/dom-history.router.ts), [`dom-navigation.router.ts`](../../packages/libs/dota-router/src/router/dom-navigation.router.ts), and [`Types.ts`](../../packages/libs/dota-router/src/Types.ts).
