import type {Window} from 'happy-dom';

const WINDOW_GLOBAL_KEYS = [
  'window', 'self', 'document', 'customElements', 'location', 'history', 'navigator',
  'HTMLElement', 'Element', 'Node', 'Text', 'Comment', 'ShadowRoot', 'DocumentFragment',
  'NodeFilter', 'Event', 'CustomEvent', 'EventTarget', 'MutationObserver', 'HTMLTemplateElement',
  'IntersectionObserver', 'ResizeObserver', 'DOMParser', 'XMLSerializer', 'SVGElement', 'SVGSVGElement',
  'fetch', 'Request', 'Response', 'Headers',
  'AbortController', 'AbortSignal', 'URL', 'URLSearchParams', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'performance'
] as const;

/** Browser-global names temporarily redirected to the active happy-dom route window. */
type WindowGlobalKey = typeof WINDOW_GLOBAL_KEYS[number];

/**
 * Exact global property state captured before one prerender route replaces a browser API.
 * The restore callback replays this descriptor or removes the property when it did not
 * exist, preserving the Vite process rather than merely restoring its previous value.
 */
type GlobalPropertySnapshot = {
  /** Browser-global name temporarily redirected to the route-specific window. */
  key: string;
  /** Original descriptor, absent when the property did not previously exist. */
  descriptor?: PropertyDescriptor;
};

/**
 * Exposes one happy-dom realm to application modules that read browser globals.
 * It snapshots full property descriptors before every replacement so cleanup restores
 * writable/configurable behavior as well as values, preventing route state from leaking.
 * @param window Isolated route window whose values should become temporarily global.
 * @returns Cleanup callback that restores every prior descriptor in reverse installation order.
 */
export function installWindowGlobals(window: Window): () => void {
  const snapshots: GlobalPropertySnapshot[] = [];
  const windowValues = window as unknown as Record<WindowGlobalKey, unknown>;
  for (const key of WINDOW_GLOBAL_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    if (descriptor && !descriptor.configurable) continue;
    snapshots.push({key, descriptor});
    const value = key === 'window' || key === 'self' ? window : windowValues[key];
    Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
  }

  return () => {
    for (const {key, descriptor} of snapshots.toReversed()) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  };
}
