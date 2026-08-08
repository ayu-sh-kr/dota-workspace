import {
  HYDRATION_TEMPLATE_ATTRIBUTE,
  HYDRATION_SCOPE_ATTRIBUTE,
  HYDRATION_VERSION_ATTRIBUTE,
  MARKER_VERSION,
  html,
  hydrate,
  keyed,
  render,
  setHydrationEmit,
  setHydrationMismatchPolicy,
  templateId,
  update,
  when
} from '@dota/main';

afterEach(() => {
  setHydrationEmit(false);
  setHydrationMismatchPolicy('warn');
  vi.restoreAllMocks();
});

describe('durable rendering and hydration', () => {
  it('keeps durable marker emission disabled for ordinary client mounts', () => {
    const root = document.createElement('section');

    render(root, html`<p title="${'client'}">${'content'}</p>`);

    expect(root.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE)).toBe(false);
    expect(root.innerHTML).not.toContain('data-dh-a');
    expect(root.innerHTML).not.toContain('<!--dh:p');
  });

  it('warns and rerenders when legacy output cannot adopt serialized markers', () => {
    const root = document.createElement('section');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    hydrate(root, '<p>legacy</p>');

    expect(warning).toHaveBeenCalledWith(
      '[dota-rendering] hydration mismatch; re-rendering the affected component',
      expect.any(Error)
    );
    expect(root.innerHTML).toBe('<p>legacy</p>');
  });

  it('warns and remounts when serialized child markers are malformed', () => {
    const view = (label: string) => html`<p>${label}</p>`;
    const serverRoot = document.createElement('section');
    setHydrationEmit(true);
    render(serverRoot, view('server'));

    const reparsed = document.createElement('div');
    reparsed.innerHTML = serverRoot.outerHTML;
    const clientRoot = reparsed.firstElementChild as HTMLElement;
    clientRoot.querySelector('p')?.firstChild?.remove();
    setHydrationEmit(false);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    hydrate(clientRoot, view('client'));

    expect(warning).toHaveBeenCalledWith(
      '[dota-rendering] hydration mismatch; re-rendering the affected component',
      expect.any(Error)
    );
    expect(clientRoot.textContent).toBe('client');
  });

  it('can throw hydration mismatches when selected for one call or the module', () => {
    const root = document.createElement('section');

    expect(() => hydrate(root, '<p>legacy</p>', {mismatch: 'throw'}))
      .toThrow('Hydration requires a structured template result');

    setHydrationMismatchPolicy('throw');
    expect(() => hydrate(root, '<p>legacy</p>'))
      .toThrow('Hydration requires a structured template result');
  });

  it('adopts serialized attribute and child parts without replacing the root', () => {
    const view = (label: string) => html`<p title="${label}">${label}</p>`;
    const serverRoot = document.createElement('section');
    setHydrationEmit(true);
    render(serverRoot, view('server'));

    const reparsed = document.createElement('div');
    reparsed.innerHTML = serverRoot.outerHTML;
    const clientRoot = reparsed.firstElementChild as HTMLElement;
    const paragraph = clientRoot.querySelector('p');
    const text = paragraph?.childNodes[1];
    const replaceChildren = vi.spyOn(clientRoot, 'replaceChildren');
    setHydrationEmit(false);

    const instance = hydrate(clientRoot, view('server'));
    const result = update(instance, view('client'));

    expect(replaceChildren).not.toHaveBeenCalled();
    expect(result).toEqual({kind: 'patch', changedParts: 2, replacedNodes: 0});
    expect(clientRoot.querySelector('p')).toBe(paragraph);
    expect(paragraph?.childNodes[1]).toBe(text);
    expect(paragraph?.getAttribute('title')).toBe('client');
    expect(paragraph?.textContent).toBe('client');
  });

  it('recursively adopts conditional and keyed ranges for later patches', () => {
    const view = (label: string, values: readonly string[]) => html`
      <main>
        ${when(true, html`<h1>${label}</h1>`)}
        <ul>${keyed(values, (value) => value, (value) => html`<li>${value}</li>`)}</ul>
      </main>
    `;
    const serverRoot = document.createElement('section');
    setHydrationEmit(true);
    render(serverRoot, view('before', ['one', 'two']));

    const reparsed = document.createElement('div');
    reparsed.innerHTML = serverRoot.outerHTML;
    const clientRoot = reparsed.firstElementChild as HTMLElement;
    const heading = clientRoot.querySelector('h1');
    const retainedItem = clientRoot.querySelectorAll('li')[1];
    setHydrationEmit(false);

    const instance = hydrate(clientRoot, view('before', ['one', 'two']));
    update(instance, view('after', ['two', 'three']));

    expect(clientRoot.querySelector('h1')).toBe(heading);
    expect(heading?.textContent).toBe('after');
    expect(clientRoot.querySelectorAll('li')[0]).toBe(retainedItem);
    expect([...clientRoot.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['two', 'three']);
  });

  it('uses a stable content identity and marker version across template instances', () => {
    const first = ['<p>', '</p>'] as unknown as TemplateStringsArray;
    const second = ['<p>', '</p>'] as unknown as TemplateStringsArray;
    Object.defineProperty(first, 'raw', {value: [...first]});
    Object.defineProperty(second, 'raw', {value: [...second]});

    expect(templateId(first)).toBe(templateId(second));
    expect(MARKER_VERSION).toBe(2);

    const boundaryFirst = ['a\0b', 'c'] as unknown as TemplateStringsArray;
    const boundarySecond = ['a', 'b\0c'] as unknown as TemplateStringsArray;
    expect(templateId(boundaryFirst)).not.toBe(templateId(boundarySecond));

    const root = document.createElement('section');
    setHydrationEmit(true);
    render(root, html`<p>${'value'}</p>`);
    expect(root.getAttribute(HYDRATION_VERSION_ATTRIBUTE)).toBe(String(MARKER_VERSION));
    expect(root.getAttribute(HYDRATION_SCOPE_ATTRIBUTE)).toMatch(/^h\d+$/);
  });

  it('clears build-only host identity when a later structural remount is client-rendered', () => {
    const root = document.createElement('section');
    setHydrationEmit(true);
    const instance = render(root, html`<p>${'server'}</p>`);
    setHydrationEmit(false);

    update(instance, html`<article>${'client'}</article>`);

    expect(root.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE)).toBe(false);
    expect(root.hasAttribute(HYDRATION_VERSION_ATTRIBUTE)).toBe(false);
    expect(root.hasAttribute(HYDRATION_SCOPE_ATTRIBUTE)).toBe(false);
    expect(root.innerHTML).not.toContain('<!--dh:p');
    expect(root.textContent).toBe('client');
  });

  it('adopts only the durable markers owned by a component scope', () => {
    const parentView = (label: string) => html`<nested-view data-label="${label}"></nested-view><p>${label}</p>`;
    const childView = (label: string) => html`<article data-label="${label}">${label}</article>`;
    const serverRoot = document.createElement('section');
    setHydrationEmit(true);
    render(serverRoot, parentView('parent server'));
    const serverChild = serverRoot.querySelector('nested-view') as HTMLElement;
    render(serverChild, childView('child server'));

    const shell = document.createElement('div');
    shell.innerHTML = serverRoot.outerHTML;
    const clientRoot = shell.firstElementChild as HTMLElement;
    const clientChild = clientRoot.querySelector('nested-view') as HTMLElement;
    const childArticle = clientChild.querySelector('article');
    const parentParagraph = clientRoot.querySelector('p');
    setHydrationEmit(false);

    const parent = hydrate(clientRoot, parentView('parent server'));
    const child = hydrate(clientChild, childView('child server'));
    update(parent, parentView('parent client'));
    update(child, childView('child client'));

    expect(clientRoot.querySelector('nested-view')).toBe(clientChild);
    expect(clientChild.querySelector('article')).toBe(childArticle);
    expect(clientRoot.querySelector('p')).toBe(parentParagraph);
    expect(clientChild.getAttribute('data-label')).toBe('parent client');
    expect(childArticle?.getAttribute('data-label')).toBe('child client');
    expect(parentParagraph?.textContent).toBe('parent client');
    expect(childArticle?.textContent).toBe('child client');
  });
});
