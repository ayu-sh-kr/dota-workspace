import {afterEach, describe, expect, it} from 'vitest';
import {BadgeComponent} from '@dota/components/badge/badge.component.ts';

if (!customElements.get('dota-badge-test')) customElements.define('dota-badge-test', BadgeComponent);

const render = (props: Partial<BadgeComponent> = {}, content = '<strong>child</strong>') => {
  const element = document.createElement('dota-badge-test') as BadgeComponent;
  Object.assign(element, props);
  (element as BadgeComponent & {content: string}).content = content;
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('BadgeComponent', () => {
  it('renders label text as escaped content instead of initial child markup', () => {
    const element = render({label: '<script>alert(1)</script>'});
    expect(element.querySelector('span span')?.textContent).toBe('<script>alert(1)</script>');
    expect(element.querySelector('span span')?.innerHTML).toContain('&lt;script&gt;');
    expect(element.querySelector('strong')).toBeNull();
  });

  it('retains composed light-DOM content when label is empty', () => {
    const element = render({}, '<strong>child</strong>');
    expect(element.querySelector('strong')?.textContent).toBe('child');
  });

  it('maps subtle to soft and supports rounded and size variants', () => {
    const element = render({variant: 'subtle', rounded: 'lg', size: 'xl', color: 'blue'});
    const outer = element.firstElementChild!;
    expect(outer.className).toContain('rounded-lg');
    expect(outer.className).toContain('text-xl');
    expect(outer.className).toContain('bg-blue-50');
  });

  it('applies partial style overrides and falls back for unknown tokens', () => {
    const themed = render({config: {base: 'custom-base', content: 'custom-content'}});
    expect(themed.firstElementChild?.className).toContain('custom-base');
    expect(themed.querySelector('span span')?.className).toBe('custom-content');

    const fallback = render({size: 'unknown' as never, rounded: 'unknown' as never, color: 'unknown' as never, variant: 'unknown' as never});
    expect(fallback.firstElementChild?.className).toContain('px-2.5');
    expect(fallback.firstElementChild?.className).toContain('rounded-full');
  });
});
