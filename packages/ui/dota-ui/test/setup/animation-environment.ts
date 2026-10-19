import {vi} from 'vitest';

/** Intersection callbacks of the observers created since the last {@link visibleAnimationEnvironment} call. */
export const intersectionCallbacks: Array<(visible: boolean) => void> = [];

/**
 * Lets `startAnimationLoop` run its first frame right away: every observed element is
 * reported visible (until a test calls an entry of {@link intersectionCallbacks}) and
 * idle callbacks run immediately. Restored by `vi.unstubAllGlobals()`.
 */
export function visibleAnimationEnvironment(): void {
  intersectionCallbacks.length = 0;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      const report = (isIntersecting: boolean) =>
        this.callback([{isIntersecting, target} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      intersectionCallbacks.push(report);
      report(true);
    }
    disconnect() {}
  });
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    callback();
    return 1;
  });
  vi.stubGlobal('cancelIdleCallback', () => undefined);
}
