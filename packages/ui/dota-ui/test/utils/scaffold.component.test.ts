import {afterEach, describe, expect, it} from 'vitest';
import {ScaffoldComponent, ScaffoldStyle} from '@dota/components/utils/scaffold.component.ts';

if (!customElements.get('app-scaffold-test')) {
  customElements.define('app-scaffold-test', ScaffoldComponent);
}

const createScaffold = (content = '<p>Consumer content</p>') => {
  const el = document.createElement('app-scaffold-test') as ScaffoldComponent;
  (el as unknown as {content: string}).content = content;
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ScaffoldComponent', () => {
  it('wraps consumer content with the default scaffold style', () => {
    const el = createScaffold('<button>Action</button>');
    const template = document.createElement('template');

    template.innerHTML = el.render();

    const wrapper = template.content.firstElementChild!;

    expect(wrapper.className).toContain(ScaffoldStyle.container);
    expect(wrapper.querySelector('button')?.textContent).toBe('Action');
  });

  it('adds instance classes without changing the configured content', () => {
    const el = createScaffold('<span>Content</span>');
    el.className = 'max-w-prose';

    const template = document.createElement('template');
    template.innerHTML = el.render();
    const wrapper = template.content.firstElementChild!;

    expect(wrapper.className).toContain(ScaffoldStyle.container);
    expect(wrapper.className).toContain('max-w-prose');
    expect(wrapper.querySelector('span')?.textContent).toBe('Content');
  });

  it('uses a partial style override and preserves an explicit empty container', () => {
    const custom = createScaffold();
    custom.config = {container: 'custom-scaffold'};

    expect(custom.render()).toContain('custom-scaffold');
    expect(custom.render()).not.toContain(ScaffoldStyle.container);

    const empty = createScaffold();
    empty.config = {container: ''};
    const template = document.createElement('template');
    template.innerHTML = empty.render();

    expect(template.content.firstElementChild?.className.trim()).toBe('');
  });
});
