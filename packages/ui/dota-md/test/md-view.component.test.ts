import {afterEach, describe, expect, it} from 'vitest';
import {BeforeInit, Component} from '@ayu-sh-kr/dota-core';
import {html, trustedHTML, type TemplateResult} from '@ayu-sh-kr/dota-rendering';
import {MD_RENDERED_EVENT, MdViewComponent, type MdRenderedDetail} from '@dota/components/md-view.component.ts';
import {flatMarkdownTheme} from '@dota/md-themes';

/** Subclass in the pre-composition style: custom markup built from `content`. */
class LegacyMdView extends MdViewComponent {
  render(): TemplateResult {
    return html`<section class="legacy">${trustedHTML(this.content)}</section>`;
  }
}

/** Decorated subclass with its own before-init hook, which must not replace the base capture. */
@Component({selector: 'hooked-md-view', shadow: false})
class HookedMdView extends MdViewComponent {
  ownHookRan = false;

  @BeforeInit()
  markOwnHook() {
    this.ownHookRan = true;
  }
}

if (!customElements.get('md-view')) customElements.define('md-view', MdViewComponent);
if (!customElements.get('legacy-md-view')) customElements.define('legacy-md-view', LegacyMdView);
if (!customElements.get('hooked-md-view')) customElements.define('hooked-md-view', HookedMdView);

/** Parses markup off-document, then connects it, so views see their children on connect. */
const connect = (markup: string): MdViewComponent => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.firstElementChild as MdViewComponent;
};

/** Waits for Dota's asynchronous initialization to finish. */
const initialized = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MdViewComponent', () => {
  it('renders Markdown into its themed wrapper and lazy-loads images', async () => {
    const view = connect('<md-view theme="flat" color="indigo"></md-view>');
    await initialized();

    view.renderMarkdown('# Title\n\n![alt](/a.png)');

    const content = view.querySelector<HTMLElement>('[data-md-content]')!;
    expect(content.style.fontFamily).toContain('Helvetica');
    expect(content.querySelector('h1')!.className).toContain(flatMarkdownTheme.color.indigo!.h1!.text!);
    expect(content.querySelector('img')!.getAttribute('loading')).toBe('lazy');
  });

  it('uses content-class in place of the default wrapper layout', async () => {
    const view = connect('<md-view content-class="prose-body"></md-view>');
    await initialized();

    view.renderMarkdown('text');

    const content = view.querySelector('[data-md-content]')!;
    expect(content.classList.contains('prose-body')).toBe(true);
    expect(content.classList.contains('px-3')).toBe(false);
  });

  it('keeps content nodes when the color changes', async () => {
    const view = connect('<md-view theme="flat" color="indigo"></md-view>');
    await initialized();
    view.renderMarkdown('paragraph');
    const paragraph = view.querySelector('p')!;

    view.onColorChange({name: 'md:color-change', data: {color: 'rose'}});

    expect(view.querySelector('p')).toBe(paragraph);
    expect(paragraph.className).toContain(flatMarkdownTheme.color.rose!.p!.text!);
    expect(paragraph.className).not.toContain(flatMarkdownTheme.color.indigo!.p!.text!);
  });

  it('adopts a prerendered wrapper instead of nesting it', async () => {
    const view = connect('<md-view><div data-md-content><p>Prerendered</p></div></md-view>');
    await initialized();

    expect(view.querySelectorAll('[data-md-content]')).toHaveLength(1);
    expect(view.querySelector('[data-md-content] p')?.textContent).toBe('Prerendered');
  });

  it('mounts Markdown received before initialization once it is ready', async () => {
    const view = connect('<md-view><p>Loading…</p></md-view>');

    view.renderMarkdown('Arrived first');
    await initialized();

    expect(view.querySelector('[data-md-content]')?.textContent?.trim()).toBe('Arrived first');
  });

  it('dispatches one bubbling md-rendered event per new result for host post-processing', async () => {
    const view = connect('<md-view></md-view>');
    await initialized();
    const details: MdRenderedDetail[] = [];
    document.body.addEventListener(MD_RENDERED_EVENT, (event) => {
      const {detail} = event as CustomEvent<MdRenderedDetail>;
      detail.container.querySelector('h1')?.remove();
      details.push(detail);
    });

    const result = view.renderMarkdown('# Title\n\nBody');
    view.onContentChange({name: 'md:render', data: result});

    expect(details).toHaveLength(1);
    expect(details[0].result).toBe(result);
    expect(view.querySelector('h1')).toBeNull();
    expect(view.querySelector('p')?.textContent).toBe('Body');
  });
});

describe('MdViewComponent subclasses', () => {
  it('still re-render published content through an overridden render()', async () => {
    const view = connect('<legacy-md-view></legacy-md-view>');
    await initialized();

    view.onContentChange({name: 'md:render', data: {html: '<p>Published</p>', toc: []}});

    expect(view.querySelector('.legacy p')?.textContent).toBe('Published');
  });
});

describe('MdViewComponent prerendered content', () => {
  it('replaces the serialized theme classes when another color is applied', async () => {
    const indigo = flatMarkdownTheme.color.indigo!.p!.text!;
    const view = connect(`<md-view theme="flat" color="indigo"><div data-md-content><p class="${indigo}">Text</p><code class="hljs">x</code></div></md-view>`);

    view.onColorChange({name: 'md:color-change', data: {color: 'rose'}});
    await initialized();

    const paragraph = view.querySelector('p')!;
    expect(paragraph.className).toContain(flatMarkdownTheme.color.rose!.p!.text!);
    expect(paragraph.className).not.toContain(indigo);
    expect(view.querySelector('code')!.className).toBe('hljs');
  });
  it('adopts authored content when upgraded before its children are parsed, in subclasses too', async () => {
    const template = document.createElement('template');
    template.innerHTML = '<hooked-md-view><p>authored</p></hooked-md-view>';
    document.body.append(template.content);
    const view = document.querySelector('hooked-md-view') as HookedMdView;
    await initialized();

    expect(view.content).toBe('<p>authored</p>');
    expect(view.ownHookRan).toBe(true);
    expect(view.querySelectorAll('[data-md-content]')).toHaveLength(1);
  });
});
