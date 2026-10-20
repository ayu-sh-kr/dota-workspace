---
name: dota-web-components
description: Use when creating, modifying, or reviewing app-owned components and pages in packages/apps/dota-web. Covers custom-element conventions, routing, lifecycle, rendering and hydration, shared CSS grammar, colocated component styles, and Markdown views.
---

# Dota Web Components

Use this skill for feature and page composition that belongs to `packages/apps/dota-web`. Use `reusable-web-component-design` instead when the component is a public `dota-ui` library primitive.
Dota web components are TypeScript classes built on `dota-core`/`dota-wrap`, registered with decorators, and rendered as custom elements from `html` templates that prerendered pages hydrate in place.

Primary local references:

- `packages/apps/dota-web/src/pages/home.page.ts`
- `packages/apps/dota-web/src/components/blogs/blog-view.component.ts`
- `packages/apps/dota-web/src/components/utils/buttons/dark-mode-button.component.ts`
- `packages/libs/dota-core/src/core/elements/base-elements.ts`
- `packages/libs/dota-core/src/core/elements/dota-page-element.ts`

## Package Imports

Prefer imports from `@ayu-sh-kr/dota-wrap`, not from `dota-core` directly, inside `dota-web`.

```ts
import {
  BaseElement,
  Component,
  Property,
  String,
  BindEvent,
  WindowListener,
} from "@ayu-sh-kr/dota-wrap/core";
```

Use these package surfaces by responsibility:

```ts
import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import { html, keyed, trustedHTML, when, type TemplateResult } from "@ayu-sh-kr/dota-wrap/rendering";
import { Route } from "@ayu-sh-kr/dota-wrap/router";
```

Use the app alias for local source:

```ts
import { GeneralUtils } from "@dota/utils/GeneralUtils.ts";
import { DocLoaderService } from "@dota/service/doc-loader.service.ts";
```

Local imports commonly include the `.ts` extension because `tsconfig.json` enables `allowImportingTsExtensions`.

## Component Shape

Every component uses `@Component` and extends `BaseElement`, unless it is a routed page.

```ts
@Component({
  selector: "example-card",
  shadow: false,
})
export class ExampleCardComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <section class="rounded-lg border border-gray-200 dark:border-gray-800">
        Example
      </section>
    `;
  }
}
```

Conventions:

- Use kebab-case custom element selectors, for example `blog-view`, `dark-mode-button`, `resource-section`.
- Use PascalCase class names with a suffix like `Component` or `Page`.
- Keep `shadow: false` unless style isolation is explicitly required. `dota-web` relies on global Tailwind classes and dark-mode variants.
- Include an explicit constructor that calls `super()` when matching existing component style.
- Return an `html` template from `render()`, typed `TemplateResult`. Do not return strings or use the `HTML` helper: string output cannot be hydrated, so the browser rebuilds that component's prerendered DOM on load (see Rendering and Hydration below).

## Pages

Pages extend `DotaPageElement`, include a `@Route`, and implement `get seo(): SEO`.

```ts
@Route({ path: "/docs" })
@Component({
  selector: "doc-page",
  shadow: false,
})
export class DocPage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      title: "Dota Web - Documentation",
      description: "Explore the comprehensive documentation for Dota Web.",
      keywords: ["Dota Web Documentation", "Dota Framework Guide"],
      og: {
        title: "Dota Web Documentation",
        description: "Dive into the detailed documentation for Dota Web.",
      },
    };
  }

  render(): TemplateResult {
    return html`<doc-section></doc-section>`;
  }
}
```

`DotaPageElement` updates `document.title`, description, keywords, favicon, and Open Graph tags during `handleBeforeInit()`. Do not duplicate SEO updates in page components.

Use page shells to compose sections rather than putting all UI into the page. `home.page.ts` is the pattern: header, main, section components, footer.

## Properties and Attributes

Use `@Property` for values passed as HTML attributes. The attribute name is kebab-case; the class property is camelCase.

```ts
@Property({ name: "current-blog", type: String })
currentBlog: string = "";

@Property({ name: "max-width", type: String })
maxWidth: string = "max-w-3xl";
```

Rules:

- Import primitive type markers such as `String` from `@ayu-sh-kr/dota-wrap/core`.
- Set a class field default even when the property can be overwritten by an attribute.
- Attribute changes call `bindProperty()` and then `updateHTML()` in `BaseElement`.
- When a property influences markup, reference it in `render()` with `this.propertyName`.

Use `@Param` for route/query parameters:

```ts
@Param("blog")
blog!: string;

@Param("category")
category!: string;
```

Load data after params are bound, usually in an init lifecycle event.

## Lifecycle

The core lifecycle in `BaseElement` is:

1. `connectedCallback()`
2. `handleBeforeInit()`
3. initial `render()` into the host or shadow root
4. bind properties, params, state, elements, events, emitters, and app event listeners
5. emit the connected lifecycle event
6. run after-init handlers

Common local patterns:

```ts
@OnEvent("connected", true)
async onConnected() {
  GeneralUtils.scrollToTop("smooth");
}
```

```ts
@AfterInit()
async afterViewInit() {
  // DOM and framework bindings are ready.
}
```

Use `@OnEvent("connected", true)` when matching existing app event style. Use `@AfterInit()` for direct component setup after the first render. In either case, avoid doing DOM work in the constructor.

## Events

Use decorators rather than manual `addEventListener` when the event can be described declaratively.

### Child Element Events

Use `@BindEvent` for events from elements rendered inside the component.

```ts
@BindEvent({ event: "click", id: "#dark-button" })
handleDark() {
  GeneralUtils.toggleDarkMode();
}
```

The `id` field is a CSS selector. `BaseElement` uses delegated listeners on the component root, so bindings survive `updateHTML()`.

### Host, Window, and Document Events

Use listener decorators for global or host events.

```ts
@WindowListener({ event: "themeChange" })
handleThemeChange() {
  this.updateHTML();
}
```

```ts
@HostListener({ event: "click" })
handleClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest("[data-theme]");
}
```

Use native `CustomEvent`s for browser-level concerns like `themeChange` and `onPathChange`. Use `ApplicationEventService` / `@OnEvent` for app-level message flows such as docs theme changes.

## Rendering and Hydration

Render markup with the `html` tag. Prerendered (SSG) and server-rendered pages stamp each template
with hydration markers, and the browser adopts that DOM instead of rebuilding it, so the first paint
stays the largest paint and nothing shifts. Most components use Tailwind utilities directly in the
returned template.

```ts
render(): TemplateResult {
  const isDarkTheme = GeneralUtils.isDarkMode();
  const icon = isDarkTheme
    ? "material-symbols:dark-mode"
    : "material-symbols:sunny-rounded";

  return html`
    <button id="dark-button" type="button" aria-label="Switch to ${isDarkTheme ? "light" : "dark"} mode">
      <dota-icon name="${icon}" color="${this.color}" variant="ghost" size="md"></dota-icon>
    </button>
  `;
}
```

Template rules:

- Quote every attribute interpolation (`class="${value}"`). Interpolate values only, never attribute or tag names.
- Text and attribute values are escaped by the renderer; do not escape them yourself.
- Interpolate nested `html` templates for static structure, such as a list built from configuration: `` ${items.map(item => html`<li>${item.name}</li>`)} ``. Never `.join("")` template strings.
- Use `keyed(items, key, render)` for lists that change at runtime, and `when(condition, template)` for optional fragments, so an update patches one range instead of replacing the component.
- Boolean attributes such as `disabled`, `selected`, or `hidden` cannot be template values. Use ARIA or data attributes (`aria-disabled="${disabled}"` with an `aria-disabled:` style), or switch between two `keyed`/`when` templates that differ only by the attribute.
- Insert trusted HTML, such as rendered Markdown or highlighted code, with `trustedHTML(markup)`. Use `unsafeHTML(markup)` only for constant markup.
- Close custom elements explicitly (`<dota-icon ...></dota-icon>`); `<dota-icon />` nests the following siblings inside it.

Hydration rules:

- Hydration keeps the server's values until the next update. When the first render depends on
  browser-only state (theme, `localStorage`, query parameters), render the server default, then read
  the browser state in `@OnEvent("connected", true)` and call `this.updateHTML()`; the update patches
  only the parts that differ. `blog-section`, `blog-pagination`, and `dark-mode-button` follow this pattern.
- Never read authored children with `this.innerHTML` or `this.textContent` in the constructor or a
  lifecycle hook. After hydration they hold the server-rendered output, not the authored input. Pass
  data through attributes (`code-snippet` takes `code`, `section-header` takes `heading` and
  `highlight`), or use a plain element for layout wrappers.
- Look up elements by a data attribute rather than a per-instance random ID: hydration keeps the ID
  the server generated.
- Change a component's DOM through `render()` state and `updateHTML()`, not by writing `textContent`
  or `innerHTML` into elements that hold template parts.

Styling conventions:

- Use semantic Tailwind utilities and shared type/layout classes inline; see the CSS grammar below.
- Let semantic tokens resolve light/dark colors. Use `dark:` only for a component-specific structural or visual effect that cannot be expressed by the shared roles.
- Use responsive prefixes such as `sm:`, `md:`, `lg:`, and `xl:` for layout changes.
- Prefer composition with existing custom elements such as `app-header`, `app-footer`, `md-view`, `md-toc`, `dota-icon`, and section components.

### Shared CSS grammar and ownership

The application-wide foundation lives under `packages/apps/dota-web/public/assets/css/`
and is imported by `src/style.css`, before page and component styles:

| File | Owns |
| --- | --- |
| `font.css` | Font loading and body, display, and code font stacks |
| `theme.css` | Literal color collection and palette ramps; no component selectors |
| `color.css` | Semantic colors, mode mappings, status roles, surfaces, actions, and shared treatments |
| `typography.css` | Named type roles, including size, weight, leading, and tracking |
| `layout.css` | Spacing scale, containers, section rhythm, shared grids, radii, and stacking |
| `action.css` | Primary, secondary, text, icon, and compact action grammar and interaction states |

Consume roles such as `--foreground-color`, `--primary-color`, `--type-section-size`, and
`--layout-gutter`. Prefer `text-muted`, `bg-surface`, `border-default`, `type-section`,
`surface-card`, `layout-page`, and `layout-split` over repeated palette utilities or
independent heading/container scales. `tailwind.config.ts` maps semantic utilities to
these properties. This application uses Tailwind 3: declare tokens with `:root` and
`html.dark`, not Tailwind 4 `@theme`/`@source` directives copied from other projects.

Actions consume `button-primary`, `button-secondary`, `button-link`, or `button-icon`.
Use `button-compact` for dense toolbars and `button-code` for controls on fixed code
surfaces. The action grammar owns geometry, type, hierarchy, hover, focus, disabled,
and reduced-motion states. Primary actions use neutral contrast; accents identify links
and focus. Action shapes follow the navigation/tab pill family, while panels use the
card radius. Do not invent a component-specific CTA silhouette or color treatment;
change the shared grammar when the requested change should apply to an action role.

Keep the reusable palette collection in `theme.css`; changing the active application
palette belongs in `color.css`. Components consume semantic roles rather than literal
colors or numbered palette steps. Keep link, filled-action, on-action, and code-surface
roles distinct so each can maintain readable contrast in both modes. Component library
color attributes remain library contracts; app-specific appearance should use the
library's supported class/config hooks rather than change its public presets.

When a component needs additional values or overrides, give it a directory containing
both its implementation and stylesheet:

```text
src/components/home/hero-section/
  hero-section.component.ts
  hero-section.component.css
```

Import that stylesheet centrally in `src/style.css`. Scope selectors and local custom
properties to the owning component or a distinctive class. Derive local values from
the shared grammar; do not add component-specific `:root` tokens. Promote a role to the
foundation only when it has an application-wide meaning or real reuse. A component
that needs only shared classes does not require an empty stylesheet or new directory.

Page-only composition and coordinated effects belong beside the page, for example
`src/pages/home/home.page.ts` and `home.page.css`. Update imports/barrels when moving
components; preserve selectors and runtime behavior. Do not move library styles into
the app foundation or impose the app's palette on published library defaults.

Validation should include the app build and relevant tests, confirmation that CSS
imports are bundled without unresolved paths or `@apply`, and visual checks of light,
dark, mobile, and reduced-motion states when a browser is available. Files in `public`
are copied as static assets too; the app must consume the processed `style.css` entry,
not link raw component stylesheets containing Tailwind directives.
- Keep markup readable with multiline templates.

## Data Loading and Markdown

Instantiate local services in the constructor, then call them after params/properties are available.

```ts
docLoader!: DocLoaderService;

constructor() {
  super();
  this.docLoader = new DocLoaderService();
}

@OnEvent("connected", true)
async afterViewInit() {
  if (this.blog && this.category) {
    this.currentBlog = this.blog.trim();
    const raw = await this.docLoader.loadBlog(
      `${this.category.toLowerCase()}/${this.blog}`,
    );
    MDService.render(raw, { publish: true });
  }
}
```

For markdown pages and blogs:

- Render content through `MDService.render(raw, { publish: true })`.
- Place `<md-view>` in the template where markdown should appear.
- Use `<md-toc>` for table-of-contents sidebars.
- Pass theme, color, and max-width as component properties when needed.

## Re-rendering

Call `this.updateHTML()` when internal state changes outside the automatic `@Property` attribute flow.

Examples:

- A `WindowListener` responds to `themeChange`.
- An app event updates a selected docs theme.
- A method changes local state used by `render()`.

Do not call `updateHTML()` in the constructor or before the component is initialized; `BaseElement.updateHTML()` intentionally returns early until initialization is complete.

After `updateHTML()`, `BaseElement` rebinds `@BindEvent` methods and element references.

## Registration

The app uses `initializeApp()` in `packages/apps/dota-web/src/main.ts` with modules from `virtual:dota-components` and routes from `virtual:dota-routes`.

When adding a component:

- Put it under the relevant `src/components/...` folder.
- Export it through a nearby `index.ts` when that folder already uses one.
- Ensure it is discoverable by the Dota Vite preloader conventions used in the repo.
- For pages, add `@Route` and make sure the page is imported/exported consistently with `src/pages/index.ts`.

External UI components from `@ayu-sh-kr/dota-ui` and markdown components from `@ayu-sh-kr/dota-md` are registered through `externalComponents` in `main.ts`.

## Checklist

Before finishing a Dota web component:

- Component has `@Component({ selector, shadow: false })`.
- Component extends `BaseElement`; routed pages extend `DotaPageElement`.
- Page components include `@Route` and `get seo(): SEO`.
- Public attributes use `@Property` with kebab-case names and typed defaults.
- Route/query values use `@Param`.
- DOM events use `@BindEvent`, `@HostListener`, `@WindowListener`, or `@DocumentListener`.
- App events use `ApplicationEventService` and `@OnEvent`.
- Markup consumes shared semantic color, typography, and layout roles.
- Shared foundation CSS is in `public/assets/css`; component overrides are colocated and imported by `src/style.css`.
- Internal state changes that affect markup call `this.updateHTML()`.
- `render()` returns an `html` template and the component never captures `innerHTML` or `textContent`.
- Browser-only state is applied after connection, so prerendered pages hydrate without warnings.
- Data loading happens after connect/init, not in `render()` or the constructor.
