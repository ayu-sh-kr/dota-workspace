import {Window} from 'happy-dom';
import {installWindowGlobals} from '@dota/vite/window-globals';

describe('installWindowGlobals', () => {
  it('installs the route window browser APIs and restores the original descriptor', () => {
    const window = new Window();
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
    const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    const restoreGlobals = installWindowGlobals(window);

    try {
      expect(globalThis.IntersectionObserver).toBe(window.IntersectionObserver);
      expect(globalThis.window).toBe(window);
      expect(globalThis.self).toBe(window);
      expect(globalThis.ResizeObserver).toBe(window.ResizeObserver);
      expect(globalThis.matchMedia).toBe(window.matchMedia);
    } finally {
      restoreGlobals();
      window.happyDOM.close();
    }

    expect(Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver')).toEqual(originalDescriptor);
    expect(Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver')).toEqual(originalResizeObserver);
  });

  it('removes globals that did not exist before the route window was installed', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
    delete (globalThis as Record<string, unknown>).IntersectionObserver;
    const window = new Window();
    const restoreGlobals = installWindowGlobals(window);

    try {
      expect(globalThis.IntersectionObserver).toBe(window.IntersectionObserver);
    } finally {
      restoreGlobals();
      window.happyDOM.close();
    }

    expect(Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver')).toBeUndefined();
    if (originalDescriptor) Object.defineProperty(globalThis, 'IntersectionObserver', originalDescriptor);
  });
});
