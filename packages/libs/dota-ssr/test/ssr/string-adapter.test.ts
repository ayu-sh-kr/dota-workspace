// @vitest-environment node
import {createStringAdapter, type RenderContext} from '@dota/ssr/index';
import {isServerRender} from '@ayu-sh-kr/dota-core';
import {FIXTURE_COMPONENTS, TaskItemComponent} from '@test/ssr/string-adapter-fixtures';

/** Builds a request context whose fetch answers `/api/tasks` from memory. */
function createContext(tasks: unknown[] = [{id: 1, title: 'Write <docs>'}, {id: 2, title: 'Ship'}], url = 'http://localhost/tasks'): RenderContext {
  return {
    url: new URL(url),
    params: {},
    state: new Map(),
    fetch: vi.fn(async () => Response.json(tasks)) as unknown as typeof fetch
  };
}

describe('createStringAdapter', () => {
  it('runs with only the module-time shims outside a render', () => {
    expect(typeof HTMLElement).toBe('function');
    expect(typeof customElements).toBe('object');
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('awaits serverLoad, renders nested light-DOM children, and returns page SEO', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});
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
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('tasks-page', createContext([{id: 7, title: 'A "quoted" task'}]));

    expect(html.startsWith('<tasks-page tasks="[{&quot;id&quot;:7,&quot;title&quot;:&quot;A \\&quot;quoted\\&quot; task&quot;}]">')).toBe(true);
    expect(html).not.toContain('<script');
  });

  it('wraps shadow components in a declarative shadow root and keeps authored children', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('tasks-page', createContext([]));

    expect(html).toContain('<p class="empty">Nothing to do</p>');
    expect(html).toContain('<shadow-badge count="0"><template shadowrootmode="open"><span part="count">0</span><slot></slot></template><em>open</em></shadow-badge>');
  });

  it('places a light-DOM host\'s authored children inside its data-dota-slot element', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('slot-page', createContext());

    expect(html).toContain('<slot-card heading="Notes"><section class="card"><h3>Notes</h3><div class="body" data-dota-slot>'
      + '<task-item label="Nested" position="0"><li class="task" data-position="0">Nested</li></task-item> and text</div></section></slot-card>');
  });

  it('shares per-request state between components', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});
    const context = createContext();
    context.state.set('visitor', 'ada');

    const {html} = await adapter.render('state-reader', context);

    expect(html).toBe('<state-reader seen="ada"><p>ada</p></state-reader>');
  });

  it('emits client-only components as empty marked hosts and sets the server flag while rendering', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('render-flag-probe', createContext());

    expect(html).toBe('<render-flag-probe><p>true</p><client-only-panel label="later" data-dota-csr=""></client-only-panel></render-flag-probe>');
    expect(isServerRender()).toBe(false);
  });

  it('only renders hosts the HTML parser would create, using the first of duplicate attributes', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('markup-probe', createContext());

    expect(html).toBe(
      '<markup-probe><!-- <task-item label="comment"></task-item> -->' +
      `<script>const tag = '<task-item label="script"></task-item>';</script>` +
      '<template><task-item label="inert"></task-item></template><p title="<task-item>"></p>' +
      '<task-item label="live" position="0"><li class="task" data-position="0">live</li></task-item></markup-probe>'
    );
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

describe('createStringAdapter hydration markers', () => {
  it('stamps template identity and a scope on hosts and marks the page as the route', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});
    const context = createContext();
    context.state.set('visitor', 'ada');

    const {html} = await adapter.render('state-reader', context);

    expect(html).toMatch(new RegExp(
      '^<state-reader path="/tasks" data-dh-route="true" data-dh-route-version="1" seen="ada" ' +
      'data-dh-c="state-reader" data-dh-t="[0-9a-z]+" data-dh-v="2" data-dh-s="h0">' +
      '<!--dota-component-start--><p data-dota-index="0" data-dota-dynamic=""><!--dh:h0:p0-->ada<!--/dh:h0:p0--></p>' +
      '<!--dota-component-end--></state-reader>$'
    ));
  });

  it('numbers scopes in document order regardless of load order', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});

    const {html} = await adapter.render('tasks-page', createContext());
    const scopes = [...html.matchAll(/data-dh-s="(h\d+)"/g)].map((match) => match[1]);

    expect(scopes).toEqual(['h0', 'h1', 'h2', 'h3']);
    expect(html).toMatch(/<task-item label="Write &lt;docs&gt;" position="0" data-dota-index="\d+" data-dota-component="task-item" data-dota-dynamic="" data-dh-a="h0:p\d+ h0:p\d+"/);
  });

  it('leaves client-only and legacy string hosts without template identity', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS});

    const {html: probe} = await adapter.render('render-flag-probe', createContext());
    const {html: legacy} = await adapter.render('legacy-note', createContext());

    expect(probe).toContain('<client-only-panel label="later" data-dota-index="1" data-dota-component="client-only-panel" data-dota-csr=""></client-only-panel>');
    expect(legacy).toBe('<legacy-note path="/tasks" data-dh-route="true" data-dh-route-version="1"><p>legacy</p></legacy-note>');
  });
});

describe('createStringAdapter browser scope', () => {
  it('backs window, document, location, and storage with the request, and element APIs with host attributes', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const {html} = await adapter.render('browser-probe', createContext([], 'http://localhost/probe?q=1'));

    expect(html).toBe('<browser-probe class="ready" data-theme="dark" style="--gap: 1rem;" seen="/probe|?q=1|1|false"><p>/probe|?q=1|1|false</p></browser-probe>');
    expect(typeof window).toBe('undefined');
  });

  it('isolates concurrent requests from each other', async () => {
    const adapter = createStringAdapter({components: FIXTURE_COMPONENTS, hydration: false});

    const [first, second] = await Promise.all([
      adapter.render('browser-probe', createContext([], 'http://localhost/first')),
      adapter.render('browser-probe', createContext([], 'http://localhost/second?x=2'))
    ]);

    expect(first.html).toContain('seen="/first||1|false"');
    expect(second.html).toContain('seen="/second|?x=2|1|false"');
  });
});
