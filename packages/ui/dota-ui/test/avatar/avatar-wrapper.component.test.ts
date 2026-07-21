import {afterEach, describe, expect, it} from 'vitest';
import {AvatarWrapper} from '@dota/components/avatar/avatar.component.ts';

if (!customElements.get('avatar-wrapper-test')) customElements.define('avatar-wrapper-test', AvatarWrapper);

const render = (props: Partial<AvatarWrapper> = {}, content = '<span>content</span>') => {
  const element = document.createElement('avatar-wrapper-test') as AvatarWrapper;
  Object.assign(element, props);
  (element as AvatarWrapper & {content: string}).content = content;
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('AvatarWrapper', () => {
  it('renders content with default container, size, and color tokens', () => {
    const element = render({ariaLabel: 'Profile'});
    const wrapper = element.firstElementChild!;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.className).toContain('rounded-full');
    expect(wrapper.className).toContain('size-8');
    expect(wrapper.getAttribute('role')).toBe('img');
    expect(wrapper.getAttribute('aria-label')).toBe('Profile');
    expect(wrapper.innerHTML).toContain('content');
  });

  it('resolves partial style configuration independently', () => {
    const element = render({size: 'xl', config: {container: 'custom-container', size: {xl: 'custom-size'}}});
    expect(element.firstElementChild?.className).toContain('custom-container');
    expect(element.firstElementChild?.className).toContain('custom-size');
  });

  it('falls back safely for unknown size and color values', () => {
    const element = render({size: 'unknown' as never, color: 'unknown' as never, variant: 'unknown' as never});
    expect(element.firstElementChild?.className).toContain('size-8');
    expect(element.firstElementChild?.className).toContain('rounded-full');
  });
});
