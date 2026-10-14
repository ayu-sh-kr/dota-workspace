---
name: dark-mode
description: Use when implementing, modifying, or reviewing dark mode in a Dota Wrap/Dota Web project. Covers class-based mode selection, semantic CSS tokens, GeneralUtils, persisted preferences, startup initialization, and themeChange window events.
---

# Skill: Implementing Dark Mode with dota-core

## Overview

Dark mode in a dota-wrap application is implemented using three cooperating pieces:
1. CSS class manipulation on `<html>` (Tailwind `dark` variant)
2. A `GeneralUtils` helper for all theme logic
3. A toggle web component that listens for the `themeChange` window event

Tailwind must be configured with `darkMode: 'class'` (the default for dota-web).

---

## Package Imports

All decorators and base classes come from the `/core` sub-export:

```ts
import {
  BaseElement,
  Component,
  AfterInit,
  BindEvent,
  WindowListener,
  HostListener,
  Property,
  String,
  HTML,
  ApplicationEventService,
} from "@ayu-sh-kr/dota-wrap/core";
```

Application-level events (if needed beyond window events) come from `/event`:

```ts
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-wrap/event";
```

`@ayu-sh-kr/dota-wrap/core` re-exports everything from `@ayu-sh-kr/dota-core`.
`@ayu-sh-kr/dota-wrap/event` re-exports everything from `@ayu-sh-kr/dota-event`.

---

## 1. The Theme Utility - `GeneralUtils`

> Source: `packages/apps/dota-web/src/utils/GeneralUtils.ts`

```ts
import { LocalStorageService } from "@dota/service/local-storage.service.ts";

export class GeneralUtils {

  // Toggle between dark and light, persist, and broadcast
  static toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    LocalStorageService.add('theme', isDarkMode ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { isDarkMode: GeneralUtils.isDarkMode() }
    }));
  }

  static isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  // Reads localStorage first, falls back to system prefers-color-scheme
  static getBrowserTheme(): string {
    const theme = LocalStorageService.get('theme');
    if (theme) return theme;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  // Apply a resolved theme string to the DOM
  static setBrowserTheme(theme: string) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
```

**Key points:**
- Toggle only the `dark` class. `public/assets/css/color.css` owns document backgrounds through semantic tokens; do not add a palette utility such as `bg-slate-950` to `<html>`.
- `'theme'` is the localStorage key.
- `toggleDarkMode` fires a native `CustomEvent('themeChange')` on `window` so any component can re-render reactively without subscribing to `ApplicationEventService`.

---

## 2. LocalStorageService

> Source: `packages/apps/dota-web/src/service/local-storage.service.ts`

```ts
export class LocalStorageService {
  static get(key: string): string | null {
    return localStorage.getItem(key);
  }
  static add(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}
```

---

## 3. Initializing Theme on App Start - `AppComponent`

Apply the saved/system theme once the root component is connected using the `@AfterInit()` lifecycle hook.

> Source: `packages/apps/dota-web/src/app.component.ts`

```ts
import { GeneralUtils } from "@dota/utils/GeneralUtils.ts";
import { AfterInit, BaseElement, Component } from "@ayu-sh-kr/dota-wrap/core";

@Component({
  selector: 'app-root',
  shadow: false
})
export class AppComponent extends BaseElement {

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    const browserTheme = GeneralUtils.getBrowserTheme();
    GeneralUtils.setBrowserTheme(browserTheme);
  }

  render(): string {
    return '';
  }
}
```

`@AfterInit()` runs after the component's initial render, ensuring the DOM is ready before class manipulation.

---

## 4. The Toggle Button Component

> Source: `packages/apps/dota-web/src/components/utils/buttons/dark-mode-button.component.ts`

```ts
import {
  BaseElement,
  Component,
  BindEvent,
  Property,
  String,
  WindowListener,
} from "@ayu-sh-kr/dota-wrap/core";
import { GeneralUtils } from "@dota/utils/GeneralUtils.ts";

@Component({
  selector: 'dark-mode-button',
  shadow: false
})
export class DarkModeButtonComponent extends BaseElement {

  @Property({ name: 'color', type: String })
  color: string = 'purple';

  constructor() {
    super();
  }

  // Bind the click on the inner element by CSS id
  @BindEvent({ event: 'click', id: '#dark-button' })
  handleDark() {
    GeneralUtils.toggleDarkMode();
  }

  // Re-render whenever any component calls toggleDarkMode()
  @WindowListener({ event: 'themeChange' })
  handleThemeChange() {
    this.updateHTML();
  }

  render(): string {
    const isDarkTheme = GeneralUtils.isDarkMode();
    const icon = isDarkTheme
      ? 'material-symbols:dark-mode'
      : 'material-symbols:sunny-rounded';

    return `
      <button id="dark-button" type="button"
              class="inline-flex size-9 items-center justify-center rounded-full text-primary hover:bg-raised active:scale-95 cursor-pointer"
              aria-label="Switch to ${isDarkTheme ? 'light' : 'dark'} mode">
        <dota-icon name="${icon}" color="${this.color}" variant="ghost" size="md"></dota-icon>
      </button>
    `;
  }
}
```

**Key decorator patterns used:**

| Decorator | Purpose |
|---|---|
| `@Component({ selector, shadow })` | Registers the class as a custom element |
| `@Property({ name, type })` | Declares a reactive HTML attribute |
| `@BindEvent({ event, id })` | Binds a DOM event on a child element matched by CSS id/selector |
| `@WindowListener({ event })` | Listens to a `window` event; calling `this.updateHTML()` re-renders |
| `@HostListener({ event })` | Listens to events on the host element itself |
| `@AfterInit()` | Lifecycle callback after initial render (used in root component) |
| `@OnEvent(name, connected?)` | Listens to `ApplicationEventService` events; `true` = fires on connect |

---

## 5. Using the Toggle Button in a Template

Once registered, embed `<dark-mode-button>` anywhere in a `render()` string:

```ts
render(): string {
  return `
    <header>
      <dark-mode-button color="purple"></dark-mode-button>
    </header>
  `;
}
```

The `color` attribute is optional (default: `'purple'`).

---

## 6. Reactivity Pattern - `themeChange` Window Event

Because components don't share state directly, the `themeChange` window event is the broadcast mechanism:

```text
User clicks dark-mode-button
  -> GeneralUtils.toggleDarkMode()
    -> toggles .dark on <html>; semantic CSS tokens resolve the mode
    -> writes to localStorage('theme')
    -> window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDarkMode } }))
      -> any component with @WindowListener({ event: 'themeChange' }) calls this.updateHTML()
```

If you need to react to theme changes in any component, add:

```ts
@WindowListener({ event: 'themeChange' })
onThemeChange() {
  this.updateHTML();
}
```

---

## 7. Tailwind Dark Variant

App components consume semantic classes mapped to CSS properties in `tailwind.config.ts`:

```html
<div class="bg-surface text-foreground">
  ...
</div>
```

`public/assets/css/color.css` defines the light roles on `:root` and overrides them on
`html.dark`. Because app components use light DOM (`shadow: false`), they inherit these
properties without extra configuration. Keep component-specific effects beside their
component and use `dark:` only when the semantic roles cannot express the effect.

---

## Checklist for Adding Dark Mode to a New Project

- [ ] `tailwind.config` has `darkMode: 'class'` (or omits it, which defaults to `'class'` in v3+)
- [ ] `GeneralUtils` (or equivalent) is available with `toggleDarkMode`, `isDarkMode`, `getBrowserTheme`, `setBrowserTheme`
- [ ] `LocalStorageService` is available for persistence
- [ ] Root component (`AppComponent`) applies theme via `@AfterInit()` on startup
- [ ] Toggle button dispatches `themeChange` via `window.dispatchEvent`
- [ ] Any component that must re-render on theme change uses `@WindowListener({ event: 'themeChange' })`
- [ ] App backgrounds and colors consume semantic tokens from `public/assets/css/color.css`
- [ ] All dota-wrap decorators imported from `@ayu-sh-kr/dota-wrap/core`
