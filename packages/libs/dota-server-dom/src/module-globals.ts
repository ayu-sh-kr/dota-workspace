import {ServerCustomElementRegistry} from './dom/custom-element-registry';
import {ServerElement} from './dom/server-element';

/**
 * Module-time globals for server rendering.
 *
 * Component modules touch two browser globals while they are *evaluated*, before any
 * render starts: `class BaseElement extends HTMLElement` in Dota Core, for example, needs
 * `HTMLElement`, and modules that register themselves call `customElements.define`.
 * {@link installServerGlobals} installs exactly those two; they stay installed for the life
 * of the process. Every other browser global depends on the request and exists only during
 * a render; see `runInBrowserScope` in the `/node` entry.
 */

/**
 * Defines a global unless one already exists. An existing value, from a browser, Happy DOM,
 * or the application itself, is always kept, so the shims never shadow a real DOM.
 * @param name Global name.
 * @param value Server stand-in to install.
 */
function installMissingGlobal(name: 'HTMLElement' | 'customElements', value: unknown): void {
  if (typeof globalThis[name] !== 'undefined') return;
  Object.defineProperty(globalThis, name, {configurable: true, writable: true, value});
}

/**
 * Installs the module-time globals (`HTMLElement`, `customElements`) when they are missing.
 * Call it before any module that extends `HTMLElement` is evaluated. Bundlers hoist and
 * reorder imports, so the call must live in a module that is evaluated on its own before
 * those imports, such as a separate entry or the `/install` side-effect import. Repeated
 * calls are harmless.
 */
export function installServerGlobals(): void {
  installMissingGlobal('HTMLElement', ServerElement);
  installMissingGlobal('customElements', new ServerCustomElementRegistry());
}
