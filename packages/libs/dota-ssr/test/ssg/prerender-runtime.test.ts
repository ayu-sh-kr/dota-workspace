import {Window} from 'happy-dom';
import type {ModuleRunnerContext} from 'vite/module-runner';
import {closePrerenderWindow, CompiledModuleEvaluator} from '@dota/ssg/prerender-runtime';

/** Builds a window whose custom element removes a body-level panel when it disconnects, like a popover. */
const createPortalWindow = (): Window => {
  const window = new Window();
  const {document} = window;
  window.customElements.define('portal-host', class extends window.HTMLElement {
    disconnectedCallback(): void {
      document.getElementById('portal-panel')?.remove();
    }
  });
  document.body.innerHTML = '<main><portal-host></portal-host></main><div id="portal-panel"></div><footer></footer>';
  return window;
};

describe('closePrerenderWindow', () => {
  it('closes a window whose disconnect callbacks remove other body nodes', async () => {
    const window = createPortalWindow();

    await expect(closePrerenderWindow(window)).resolves.toBeUndefined();
    expect(window.document.body.childNodes).toHaveLength(0);
  });

  it('reproduces the happy-dom teardown failure it works around', async () => {
    const window = createPortalWindow();

    await expect(Promise.resolve().then(() => window.happyDOM.close())).rejects.toThrow(TypeError);
  });
});

describe('CompiledModuleEvaluator', () => {
  /** Runs transformed module code with a fresh exports object, as Vite does for each evaluation. */
  const evaluate = async (evaluator: CompiledModuleEvaluator, code: string): Promise<Record<string, unknown>> => {
    const context = {
      __vite_ssr_exports__: {},
      __vite_ssr_import_meta__: {},
      __vite_ssr_import__: vi.fn(),
      __vite_ssr_dynamic_import__: vi.fn(),
      __vite_ssr_exportAll__: vi.fn(),
      __vite_ssr_exportName__: (name: string, getter: () => unknown) => {
        Object.defineProperty(context.__vite_ssr_exports__, name, {enumerable: true, get: getter});
      }
    };
    await evaluator.runInlinedModule(context as unknown as ModuleRunnerContext, code);
    return context.__vite_ssr_exports__;
  };

  it('gives every evaluation of the same module its own state', async () => {
    const evaluator = new CompiledModuleEvaluator();
    const code = 'let loads = 0; loads += 1; const registry = new Map(); __vite_ssr_exportName__("loads", () => loads); __vite_ssr_exportName__("registry", () => registry);';

    const first = await evaluate(evaluator, code);
    const second = await evaluate(evaluator, code);

    expect(first.loads).toBe(1);
    expect(second.loads).toBe(1);
    expect(second.registry).not.toBe(first.registry);
  });

  it('resolves globals when the module runs, not when it is compiled', async () => {
    const evaluator = new CompiledModuleEvaluator();
    const code = 'const route = globalThis.__dotaTestRoute; __vite_ssr_exportName__("route", () => route);';
    const global = globalThis as {__dotaTestRoute?: string};
    try {
      global.__dotaTestRoute = '/a';
      const first = await evaluate(evaluator, code);
      global.__dotaTestRoute = '/b';
      const second = await evaluate(evaluator, code);

      expect(first.route).toBe('/a');
      expect(second.route).toBe('/b');
    } finally {
      delete global.__dotaTestRoute;
    }
  });

  it('seals module exports and surfaces module errors', async () => {
    const evaluator = new CompiledModuleEvaluator();

    expect(Object.isSealed(await evaluate(evaluator, ''))).toBe(true);
    await expect(evaluate(evaluator, 'throw new Error("module failed");')).rejects.toThrow('module failed');
  });
});
