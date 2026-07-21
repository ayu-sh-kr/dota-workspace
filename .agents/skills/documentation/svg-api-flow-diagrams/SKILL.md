---
name: svg-api-flow-diagrams
description: Use when creating, revising, or repairing SVG flow diagrams that document this repository's API, plugin, component, service, event, or asynchronous behavior. Diagrams are saved under the workspace documentation root following the feature-documentation placement rule. Apply it especially when code must determine the true branches, a connector is hidden, cards overlap, or a diagram needs a clearer layout.
---

# SVG API Flow Diagrams

Create diagrams from the behavior enforced by the current code. Treat an SVG flow as technical documentation: a clean layout is not useful if it invents a branch, omits an early return, or turns independent event listeners into a sequence.

## Output Location

Follow the `feature-documentation` skill placement rule. For a workspace project the output path is:

```
<workspace-root>/documentation/<project-slug>/<domain>/<diagram-name>.svg
```

For example, a flow for the `web-type-json` plugin placed under the `plugin` domain becomes:

```
documentation/web-type-json/plugin/web-type-json-flow.svg
```

Never place diagrams beside source files, inside `src/`, inside generated directories, or under legacy `docs/flows/` paths. Create the directory tree when it does not exist.

## Establish the Behavior First

Trace the named flow before editing the SVG. The vocabulary below covers both backend services and frontend/build-tool code; use whichever terms match the codebase under review.

**Backend (Spring Boot / JVM):**
1. Read the controller or public entry point for auth-derived inputs, request fields, response shape, and status codes.
2. Read the orchestration service in execution order. Record every guard, early return, lookup, mutation, and response-producing optional value.
3. Read repository methods and SQL for lookup criteria, empty-result behavior, uniqueness, and write semantics.
4. Search for published events and read every listener. Mark whether each listener is synchronous or `@Async`, and whether it runs after commit.
5. Read relevant DTOs, assertions, and tests when they define defaults, error codes, or an otherwise ambiguous branch.

**Frontend / Build Tools (Vite plugins, Web Components, TypeScript packages):**
1. Read the plugin factory or exported entry function for its accepted configuration, option defaults, and what it returns (a Vite `Plugin` object, a middleware, a custom element class, etc.).
2. Read each **lifecycle hook** in execution order: `buildStart`, `transform`, `generateBundle`, `writeBundle`, `closeBundle` for Vite; `connectedCallback` / `disconnectedCallback` / `attributeChangedCallback` for web components; `@OnEvent(CONNECTED)` / `@OnEvent(DISCONNECTED)` for dota-core components. Record what each hook does, what state it reads or mutates, and what side effects it produces.
3. Read **watcher or event registrations** (`server.watcher.on`, `window.addEventListener`, `@HostListener`, `@WindowListener`, `@DocumentListener`). For each event, note the filter condition, the async boundary, and whether concurrent events are coalesced.
4. Read **AST / source scanning** steps: glob patterns, parser invocations (SWC, Babel, TypeScript compiler API), decorator extraction, property resolution, and how results are sorted or cached.
5. Read **artifact generation**: file write calls (`writeFile`, `fs.promises`), schema construction, manifest patching (`package.json`, `vite.config`), and cache-hit guards that skip redundant writes.
6. Read `@Property`, `@State`, `@Emitter`, and `@Component` decorator usages when they define inputs, reactive state, or output events that change the rendered or built result.
7. Read relevant tests when they reveal defaults, edge-case guards, or coalescing behavior not obvious from the implementation.

Use `rg` with hook names, function names, event names, glob patterns, and decorator names. Do not infer a branch from a name alone.

Make a short flow model before drawing:

```text
plugin factory called → buildStart hook
  → scanWebComponents (glob → SWC parse → extract @Component / @Property)
  → sortWebComponentInfos
  → writeWebTypesArtifacts
      → write web-types.json
      → patch package.json if web-types entry stale

dev server → configureServer hook
  → register watcher (add / change / unlink)
      → isScannableComponentFile? no → ignore
                                  yes → refresh() [coalesced]
                                          → scanWebComponents → writeWebTypesArtifacts
```

Use `rg` with endpoint paths, function names, exception codes, event names, and repository method names. Do not infer a branch from a method name alone.

Make a short flow model before drawing:

```text
request → authenticate → guard A?
  yes → error response
  no  → lookup B?
           yes → reuse → enrich → success
           no  → validate C? → search/create → optional result → success or empty success
```

## Choose the Diagram Content

Include only behavior that changes the output artifact, persisted state, rendered result, or a meaningful after-effect.

**Backend:**
- Show auth-derived values when they replace or constrain client input.
- Show guards in their actual order, including explicit error code or user-visible stop.
- Show an `Optional`/empty lookup as a decision only when it changes the next operation or response.
- Combine implementation-only steps that belong together (SQL search + persistence) if splitting hides domain flow.
- Show no-result success explicitly when code returns an empty collection rather than an error.
- Do not add generic database/network failure branches unless the code gives them distinct behavior.

**Frontend / Build Tools:**
- Show each **Vite lifecycle hook** (`buildStart`, `configureServer`, `writeBundle`, etc.) as a named entry point; do not collapse hooks that run at different times into one card.
- Show **watcher event types** (`add`, `change`, `unlink`) as a single fan-in when they all lead to the same branch; split them only when the code branches on the event type.
- Show a **filter guard** (`isScannableComponentFile`) as an explicit decision with an exit branch so readers know which files are ignored.
- Show **coalescing / pending-guard** logic when concurrent async events share one promise, because this changes the observable execution count.
- Show **cache-hit guards** (SVG cache map lookup, `package.json` entry equality check) as decisions only when they skip a meaningful write or network call.
- Show **AST pipeline steps** (glob → parse → extract decorators → sort) as a compact sub-flow or a labeled group, not as individual fine-grained cards.
- Show **artifact writes** (JSON file, manifest patch) as distinct terminal cards so readers see exactly what changes on disk.
- For web component event flows, show one event card and fan out to its independent `@OnEvent` / `@HostListener` handlers. Do not chain handlers merely because they consume the same lifecycle event.
- Do not add generic filesystem or network failure branches unless the code handles them with distinct behavior worth documenting.

## Visual Style

**Color palette (light mode — default):** use a white or transparent canvas; colored cards carry the semantic meaning.

| Role | Fill | Text |
| --- | --- | --- |
| Entry / trigger | `#3b5bdb` (blue) | white |
| Processing step | `#0c8599` (teal) | white |
| Decision / guard | `#e67700` (amber) | white |
| Artifact write | `#2f9e44` (green) | white |
| Skip / terminal no-op | `#868e96` (gray) | white |

Use `#495057` for synchronous connectors, `#7048e8` dashed for coalesced/async paths. Do not use a solid dark background fill for the whole canvas — it flattens contrast and makes the diagram hard to embed. Lane backgrounds, if used, should be `#f8f9fa` or left transparent.

**Text placement:** card labels do not need to fit entirely inside the card. Put the primary identifier (function name, hook name) on one short line inside the card. Place secondary detail — parameter hints, glob patterns, sub-step annotations — as a small `font-size="11"` text element immediately below or beside the card, outside its boundary. Never wrap two full sentences inside a 44 px-tall card.

**Typography:** use a highly legible sans-serif for diagram text. Prefer `DM Sans`, then `Poppins`, then `Helvetica`, `Arial`, and a generic sans-serif fallback. A Google Fonts `@import` may provide the preferred font, but the fallback stack must remain usable when the SVG is viewed offline. Avoid monospace as the default for labels or support text; reserve it for short code identifiers only when it materially improves recognition.

**Spacing rhythm:** use a shared spacing token for related text and elements. Support text below cards should use the same baseline offset throughout the diagram (normally 18–22 px below the card bottom), with equal left/right alignment to its card. Keep lane padding, card gaps, branch-marker offsets, and legend item spacing on the same small spacing grid; do not position each annotation by eye.

For a vertical stack with no exceptional branch occupying a gap, use one repeated top-to-top pitch across all cards. Do not leave a visibly larger empty interval merely because the canvas has space. Break the rhythm only when a branch, annotation block, or connector corridor has measured bounds that require it.

**Anti-clutter rule:** whitespace is part of the flow grammar. Do not place consecutive decisions side by side merely to shorten connectors. Keep at least 80 px of clear edge-to-edge space between neighboring cards; increase this to at least 100 px when the gap also contains branch labels, markers, support text, or connector turns. If a lane cannot provide that clearance, stack the cards vertically or enlarge the canvas. No label, marker, or annotation may visually bridge two unrelated cards.

**Render-scale legibility:** design for the diagram's expected preview size, not only its native `viewBox`. Use at least 15 px for card labels, 14 px for support text and branch labels, and 13 px for legend text at the source canvas size. Do not depend on 10–12 px text to carry meaning; shorten or move secondary content into a separate note when it cannot remain readable after downscaling. Use `text-rendering: geometricPrecision` where supported, but treat sufficient font size and contrast as the primary fix for blur.

**Card simplification:** when a flow has more than six steps on the primary spine, collapse internal sub-steps into a single card with an annotation note rather than adding individual cards for each substep. For example, `scanWebComponents()` covers glob, parse, decorator extraction, and sort — show one card with a short annotation, not four cards.

**Connector geometry:** connectors must be orthogonal. Use only horizontal and vertical segments with explicit 90-degree turns; never connect two cards with a diagonal segment. Route each turn through an empty corridor and keep the arrowhead endpoint on the destination boundary.

**Connector ports take priority over support text:** choose card entry and exit boundaries from flow direction before placing annotations. A vertical primary path should enter through the top and leave through the bottom. A cross-lane path should enter the side facing its source. Do not leave a card and loop back into the next card through the same side merely to protect support text. If an annotation conflicts with the natural connector, move the annotation beside the spine; never detour the primary connector around secondary text.

**Decision branch origins:** visually distinct outcomes must leave a decision from distinct card boundaries. Prefer the continuing branch from the side facing its next step and a terminal/reuse branch from another boundary. Do not originate `yes` and `no` from the same side unless they first reach a clearly visible fork outside the card. Default consecutive decisions to a vertical stack when a horizontal arrangement would compress their labels, markers, support text, or terminal branches. When the code's `no` outcome leaves the main spine, route it outward from the right edge and continue the primary path downward.

**Numeric branch markers:** when a decision has several branches or branch labels would make the chart dense, place a small numbered marker near the split and explain the number in the legend or a nearby annotation. Align each marker to the center of the card or outcome it identifies, using reserved space directly above or below that element so the association is unambiguous. Use one neutral marker style by default (`#343a40` with white text); do not reuse multiple card colors for markers unless color itself represents a required domain distinction. A circular marker must never overlap a card, connector segment, bend, arrowhead, or another marker.

For repeated branch outcomes, a corner anchor is also valid: place every marker at the same top-left inset and the same vertical clearance above its card. Reuse that inset and clearance across the branch group; do not mix centered, corner, and edge anchors without a documented reason.

## Lay Out the Flow

Use a stable visual grammar rather than fitting every branch into the first empty space.

1. Put entry points (hook calls, trigger events) on one top row.
2. Put the primary continuation on one centered vertical spine.
3. Leave deliberate vertical gaps (at least 70 px) between spine cards so each arrow has a visible tail before its arrowhead. For annotation text below a card, add 15 px below the card bottom before the next connector starts.
4. For a decision with a terminal outcome, send the terminal branch **downward in a stub** ending in a gray text annotation (no full card needed for trivial exits like "skip" or "return same promise"). Continue the non-terminal branch to the right, toward the next lane.
5. Keep a side lane's vertical ranges exclusive. Never place a card in the same vertical span as a card in an adjacent lane when a connector must pass between them.
6. Route cross-lane connectors through empty vertical corridors. If the corridor falls between two cards in the lane being crossed, verify the connector y-value is outside both cards' y + height ranges.
7. Let parallel entry triggers (watcher `add` / `change` / `unlink`) merge at a single convergence card rather than fanning into three separate paths.
8. Move explanatory notes to inline text annotations or a legend footer. Do not give a secondary implementation detail a full card that competes visually with the main flow.

For a decision, prefer this shape:

```text
[condition card]
   │                │
   ▼ (continue)     ▼ (exit stub)
[next step]      gray annotation text
```

Reverse the label names only when the code requires it; preserve the layout convention of downward continuation versus exit stub.

## Preflight the Geometry Before Drawing

Write this table before adding any SVG elements. It prevents the diagram from becoming a sequence of post-hoc spacing fixes.

| Card | x | y | w | h | cy | bottom |
| --- | --- | --- | --- | --- | --- | --- |
| … | … | … | … | … | y+h/2 | y+h |

Then check:

1. **Card height from text first.** A single-line card needs at least 40 px. For two lines inside the card, use 52 px minimum. Move the second line outside the card as an annotation rather than forcing text into a card that is too short.
2. **Connector corridors.** For every connector that crosses a lane, pick a y-value that falls outside every card's `[y, y+height]` range in the crossed lane. Record the corridor y in the table.
3. **Vertical gaps.** Between consecutive spine cards the gap must be ≥ 70 px (bottom of card A to top of card B). If annotation text sits between them, the gap must be ≥ 70 px + annotation line height.
4. **Annotation placement.** Text annotations that sit below a card must start at `card_bottom + 12`. They must not overlap the next card's top.
5. **Canvas extents.** `max(card_x + card_w)` and `max(card_y + card_h)` plus any annotation text height plus 30 px padding must both fit inside the `viewBox` width and height.
6. **Branch label positions.** Place branch labels (`yes` / `no`) beside the connector immediately after the exit point, not inside or overlapping either card.
7. **Legend budget.** If the legend is a footer block, add its height plus 20 px padding to the canvas height before drawing.
8. **Orthogonal routing.** Every connector path must contain horizontal and vertical segments only. Audit each `path` command for diagonal `L` segments and route through a reserved corridor when a lane is crossed.
9. **Numeric marker key.** For every numbered branch marker, reserve a matching legend or annotation entry and verify its color is distinct from neighboring flow colors.
10. **Typography and spacing audit.** Verify the preferred font stack is declared, labels remain legible at the rendered size, and every support annotation uses the same measured offset from its related element.
11. **Preview audit.** Inspect the SVG at its intended embedded or screenshot width. If support text blurs or disappears, enlarge it or remove it; do not solve the problem with a more decorative font or tighter layout.
12. **Marker clearance audit.** Check each marker's full circle bounding box against every card and connector corridor. Keep a visible gap around it and place it above or below the branch path, never on the path itself.
13. **Branch-origin audit.** For every decision, verify each labeled outcome leaves from a different boundary or from an explicit external fork. The branch label must sit immediately after its own exit and the continuation must point toward its next card without reversing direction.
14. **Clutter audit.** Measure edge-to-edge card gaps in both axes. Reject any layout with less than 80 px clearance, or less than 100 px where labels, markers, annotations, or turns occupy the gap. Enlarge the canvas or stack cards instead of shrinking or crowding elements.
15. **Port audit.** Verify each card's incoming arrow uses the boundary facing its source and each outgoing arrow uses the boundary facing its destination. For a vertical spine, require top-in and bottom-out unless the code actually branches sideways.
16. **Rhythm audit.** Compare top-to-top distances in each unbroken card stack. Use one consistent pitch unless a measured branch corridor requires a larger gap; document that exception in the geometry plan.

If the flow cannot pass this table at a readable font size, enlarge the canvas or split the diagram into two files. Do not shrink text to make it fit.

## SVG Construction Rules

- Keep a meaningful `<title>` and `<desc>` synchronized with the rendered behavior.
- Use a `viewBox` large enough for the entire diagram and footer. Check the background, content, and footer use the same height.
- Use `marker-end` arrows with `refX="10"` for a 10px marker so the tip meets the target border instead of disappearing inside it.
- Draw an incoming connector after its destination card when an arrowhead must remain visible; end it exactly at the card boundary.
- Use the same card width and height within a lane. Align card centers on the spine and side-lane grid.
- Label a branch close to its connector, not inside either card. Use concise `yes`/`no` labels.
- Use dashed connectors only for genuinely asynchronous/post-commit work; explain that meaning in the legend.
- Keep colors semantic and stable: API/response, processing, saved state/event, and error/stop.
- When the diagram uses semantic line styles or colors, include a visual legend with a rendered sample of every style that affects interpretation: for example a solid arrow, dashed async arrow, normal card swatch, and suspect/error card swatch. Text alone is not a legend.

## Repair an Existing Diagram

When a chart feels crowded or an arrow is hidden, repair the structure rather than nudging coordinates blindly.

1. List every card's bounding box: `x`, `y`, `width`, and `height`.
2. Identify lane conflicts: overlapping boxes, overlapping vertical ranges in one lane, or connectors that pass through a card.
3. Reassign whole branches to a free lane or convert the request path to a vertical spine. Do not stack unrelated branches in the same column.
4. Increase the distance between connected cards before changing arrow styling; tails establish direction.
5. Recheck that decision labels still describe the correct code branch after moving a card.
6. Demote non-flow commentary to the footer if it distracts from the request path.

## Verify

1. Validate syntax with `xmllint --noout <diagram>.svg`.
2. Inspect the SVG at its rendered size when a renderer is available. Check arrowheads, card bounds, labels, footer bounds, and lane separation.
3. Re-read the source flow against the final diagram: every shown branch must exist, and every branch leading to a different response/state must be represented.
4. Before delivery, perform a geometry audit against the preflight table: verify text baselines stay within their card bounds, card rectangles do not overlap, connector corridors are clear, and no element exceeds the `viewBox`.
5. If styles carry semantic meaning, verify the visual legend contains matching rendered samples and is fully inside the canvas.
6. Preserve unrelated SVGs and existing working-tree changes.
