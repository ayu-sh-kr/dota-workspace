// @vitest-environment node
import {createStringAdapter, type RenderContext} from '@dota/ssr/index';
import {isServerRender} from '@ayu-sh-kr/dota-core';
import {FIXTURE_COMPONENTS, TaskItemComponent} from '@test/ssr/string-adapter-fixtures';

/** Builds a request context whose fetch answers `/api/tasks` from memory. */
function createContext(tasks: unknown[] = [{id: 1, title: 'Write <docs>'}, {id: 2, title: 'Ship'}]): RenderContext {
  const url = new URL('http://localhost/tasks');
  return {
    url,
    params: {},
    state: new Map(),
    fetch: vi.fn(async () => Response.json(tasks)) as unknown as typeof fetch
  };
}

describe('createStringAdapter', () => {
  it('runs without any DOM implementation', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof customElements).toBe('undefined');
  });

  it('awaits serverLoad, renders nested light-DOM children, and returns page SEO', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const context = createContext();

    const {html, head} = await adapter.render('tasks-page', context);

    expect(context.fetch).toHaveBeenCalledWith('/api/tasks');
    expect(html).toContain('<task-item label="Write &lt;docs&gt;" position="0"><li class="task" data-position="0">Write &lt;docs&gt;</li></task-item>');
    expect(html).toContain('<task-item label="Ship" position="1"><li class="task" data-position="1">Ship</li></task-item>');
    expect(html).not.toContain('Nothing to do');
    expect(head).toEqual({title: 'Tasks (2)', description: 'Server-rendered task list'});
    expect(context.state.get('task-count')).toBe(2);
  });

  it('templates loaded properties onto the host instead of a state script', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});

    const {html} = await adapter.render('tasks-page', createContext([{id: 7, title: 'A "quoted" task'}]));

    expect(html.startsWith('<tasks-page tasks="[{&quot;id&quot;:7,&quot;title&quot;:&quot;A \\&quot;quoted\\&quot; task&quot;}]">')).toBe(true);
    expect(html).not.toContain('<script');
  });

  it('wraps shadow components in a declarative shadow root and keeps authored children', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});

    const {html} = await adapter.render('tasks-page', createContext([]));

    expect(html).toContain('<p class="empty">Nothing to do</p>');
    expect(html).toContain('<shadow-badge count="0"><template shadowrootmode="open"><span part="count">0</span><slot></slot></template><em>open</em></shadow-badge>');
  });

  it('shares per-request state between components', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const context = createContext();
    context.state.set('visitor', 'ada');

    const {html} = await adapter.render('state-reader', context);

    expect(html).toBe('<state-reader seen="ada"><p>ada</p></state-reader>');
  });

  it('emits client-only components as empty marked hosts and sets the server flag while rendering', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});

    const {html} = await adapter.render('render-flag-probe', createContext());

    expect(html).toBe('<render-flag-probe><p>true</p><client-only-panel label="later" data-dota-csr=""></client-only-panel></render-flag-probe>');
    expect(isServerRender()).toBe(false);
  });

  it('rejects a page selector that is not registered', async () => {
    const adapter = createStringAdapter({components: [TaskItemComponent]});

    await expect(adapter.render('tasks-page', createContext())).rejects.toThrow('No component is registered for <tasks-page>');
  });

  it('stops self-including components at the depth limit', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, maxDepth: 4});

    await expect(adapter.render('endless-loop', createContext())).rejects.toThrow('Component nesting exceeded 4 levels');
  });
});
