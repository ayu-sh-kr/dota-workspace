import {afterEach, describe, expect, it} from 'vitest';
import {PlaceholderComponent, PlaceholderStyle} from '@dota/components/placeholder/placeholder.component.ts';

if (!customElements.get('dota-placeholder-test')) {
  customElements.define('dota-placeholder-test', PlaceholderComponent);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlaceholderComponent', () => {
  it('renders the default loading surface as decorative content', () => {
    const el = document.createElement('dota-placeholder-test') as PlaceholderComponent;
    const root = el.render();
    const template = document.createElement('template');

    template.innerHTML = root;

    const container = template.content.querySelector('div')!;
    const content = container.firstElementChild!;

    expect(container.className).toContain(PlaceholderStyle.container);
    expect(content.className).toContain(PlaceholderStyle.content);
    expect(container.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds a consumer class without replacing the default style slots', () => {
    const el = document.createElement('dota-placeholder-test') as PlaceholderComponent;
    el.className = 'h-32';

    const template = document.createElement('template');
    template.innerHTML = el.render();
    const container = template.content.querySelector('div')!;

    expect(container.className).toContain(PlaceholderStyle.container);
    expect(container.className).toContain('h-32');
    expect(container.firstElementChild?.className).toContain(PlaceholderStyle.content);
  });

  it('merges partial style configuration and preserves omitted defaults', () => {
    const el = document.createElement('dota-placeholder-test') as PlaceholderComponent;
    el.config = {content: 'custom-surface'};

    const template = document.createElement('template');
    template.innerHTML = el.render();
    const container = template.content.querySelector('div')!;

    expect(container.className).toContain(PlaceholderStyle.container);
    expect(container.firstElementChild?.className).toBe('custom-surface');
  });

  it('accepts explicit empty style slots for consumer-owned styling', () => {
    const el = document.createElement('dota-placeholder-test') as PlaceholderComponent;
    el.config = {container: '', content: ''};

    const template = document.createElement('template');
    template.innerHTML = el.render();
    const container = template.content.querySelector('div')!;

    expect(container.className.trim()).toBe('');
    expect(container.firstElementChild?.className.trim()).toBe('');
  });
});
