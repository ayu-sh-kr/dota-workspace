---
name: dota-ui-component-registration
description: Use when a component exists in packages/ui/dota-ui but is not rendering or upgrading inside packages/apps/dota-web, or when adding a new dota-ui component for use in the app. Covers the required import and registration steps in dota-web/src/main.ts, plus the failure symptoms when registration is missing.
---

# Dota UI Component Registration

Use this skill when a component is already implemented in `packages/ui/dota-ui` and you want to use it in `packages/apps/dota-web`.

This repository has two separate requirements:

1. The component must be exported from `@ayu-sh-kr/dota-ui`.
2. The app must explicitly register the component in `packages/apps/dota-web/src/main.ts`.

If step 2 is skipped, the browser leaves the tag as an unknown custom element and the component never upgrades.

## Required Flow

For any new `dota-ui` component:

1. Create the component in `packages/ui/dota-ui/src/components/...`
2. Export it from `packages/ui/dota-ui/src/components/index.ts`
3. Ensure it is re-exported through `packages/ui/dota-ui/src/index.ts`
4. In `packages/apps/dota-web/src/main.ts`:
   - import the component from `@ayu-sh-kr/dota-ui`
   - add it to `externalComponents`
5. Use the tag in page/component markup
6. To test the component locally, build `dota-ui` first and then build `dota-web`

## Local Test Step

Because `dota-web` consumes `@ayu-sh-kr/dota-ui` through the package entrypoints, test the component with this order:

1. `pnpm --filter @ayu-sh-kr/dota-ui build`
2. `pnpm --filter dota-web build`

If you skip the `dota-ui` build after changing its source, `dota-web` may still run against stale package output and you can misdiagnose the problem as a rendering or registration issue.

## Canonical Pattern

In `packages/apps/dota-web/src/main.ts`:

```ts
import {
  CursorDisplacementComponent,
  CloudChamberComponent,
} from "@ayu-sh-kr/dota-ui";
```

```ts
initializeApp({
  // ...
  externalComponents: [
    CursorDisplacementComponent,
    CloudChamberComponent,
  ],
});
```

Then the tag can be used in markup:

```html
<cloud-chamber color="purple" intensity="1.1"></cloud-chamber>
```

## Failure Symptoms

If the component is not registered in `main.ts`, expect these symptoms:

- the tag appears in DevTools but has no rendered inner DOM
- `render()` never materializes children such as `<canvas>`
- layout inspection may show misleading sizes like `0x0`
- changing CSS positioning or width/height does nothing
- the tag behaves like a dead HTML element rather than a live custom element

This was the exact failure mode with `cloud-chamber`: the component file and exports existed, but `CloudChamberComponent` was missing from `dota-web/src/main.ts`.

## Debug Checklist

When a `dota-ui` component does not appear in `dota-web`, check in this order:

1. Is the class exported from `packages/ui/dota-ui/src/components/index.ts`?
2. Is `packages/ui/dota-ui/src/index.ts` exporting the components barrel?
3. Is the component imported in `packages/apps/dota-web/src/main.ts`?
4. Is it included in `externalComponents`?
5. Does the selector in `@Component({ selector: "..." })` exactly match the tag used in markup?
6. Was `@ayu-sh-kr/dota-ui` rebuilt after the component change, before testing `dota-web`?

Do not start with CSS debugging until registration is confirmed.

## Scope Boundary

Use this skill only for `dota-ui` components consumed by `dota-web`.

If the component lives directly inside `packages/apps/dota-web`, use the local page/component registration conventions from `dota-web-components` instead.
