// Hydration parity: string-adapter output must be adopted by Dota Rendering's real
// `hydrate()` in strict mode, then patch in place. Happy DOM provides the browser side.
import {createStringAdapter, type RenderContext} from '@dota/ssr/index';
import {PropertyUtils, type BaseElement, type DotaElementConstructor} from '@ayu-sh-kr/dota-core';
import {hydrate, patch, type RenderInstance} from '@ayu-sh-kr/dota-rendering';
import {FIXTURE_COMPONENTS, type Task} from '@test/ssr/string-adapter-fixtures';

/** Builds a request context whose fetch answers `/api/tasks` with the given rows. */
function createContext(tasks: Task[]): RenderContext {
  return {
    url: new URL('http://localhost/tasks'),
    params: {},
    state: new Map(),
    fetch: (async () => Response.json(tasks)) as unknown as typeof fetch
  };
}

/** Parses server HTML inertly, as the browser holds it before components upgrade. */
function parseServerHtml(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild as HTMLElement;
}

/**
 * Re-creates the client-side component for a server host and adopts the host's DOM.
 * The client instance is seeded from the host's attributes, exactly as an upgrade would be.
 */
function hydrateHost(host: HTMLElement): {component: BaseElement; session: RenderInstance} {
  const Component = customElements.get(host.localName)!;
  const component = new Component() as BaseElement;
  for (const name of host.getAttributeNames()) component.setAttribute(name, host.getAttribute(name)!);
  PropertyUtils.seedInitialValues(component);
  return {component, session: hydrate(host, component.render(), {mismatch: 'throw'})};
}

describe('string adapter hydration parity', () => {
  beforeAll(() => {
    (FIXTURE_COMPONENTS as unknown as DotaElementConstructor[]).forEach((component) => {
      const selector = component.__dotaSelector!;
      if (!customElements.get(selector)) customElements.define(selector, component);
    });
  });

  it('is adopted by hydrate() for the page and every nested light-DOM host', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const {html} = await adapter.render('tasks-page', createContext([{id: 1, title: 'Write <docs>'}, {id: 2, title: 'Ship'}]));
    const page = parseServerHtml(html);
    const lightHosts = [page, ...page.querySelectorAll<HTMLElement>('task-item')];

    expect(lightHosts).toHaveLength(3);
    lightHosts.forEach((host) => expect(() => hydrateHost(host)).not.toThrow());
  });

  it('patches adopted text and attribute parts without replacing server nodes', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const {html} = await adapter.render('tasks-page', createContext([{id: 1, title: 'Write docs'}]));
    const host = parseServerHtml(html).querySelector<HTMLElement>('task-item')!;
    const serverItem = host.querySelector('li')!;
    const {component, session} = hydrateHost(host);

    component.label = 'Edited';
    component.position = 4;
    patch(session, component.render());

    expect(host.querySelector('li')).toBe(serverItem);
    expect(serverItem.textContent).toBe('Edited');
    expect(serverItem.getAttribute('data-position')).toBe('4');
  });

  it('adopts conditional branches and keyed entries, then reconciles them', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const {html} = await adapter.render('tasks-page', createContext([]));
    const page = parseServerHtml(html);
    const {component, session} = hydrateHost(page);
    expect(page.querySelector('p.empty')?.textContent).toBe('Nothing to do');

    component.tasks = [{id: 3, title: 'Later'}];
    patch(session, component.render());

    expect(page.querySelector('p.empty')).toBeNull();
    expect(page.querySelectorAll('task-item')).toHaveLength(1);
    expect(page.querySelector('task-item')?.getAttribute('label')).toBe('Later');
  });

  it('cannot be adopted when markers are disabled', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});
    const {html} = await adapter.render('tasks-page', createContext([]));

    expect(() => hydrateHost(parseServerHtml(html))).toThrow('Missing hydration scope');
  });
});
