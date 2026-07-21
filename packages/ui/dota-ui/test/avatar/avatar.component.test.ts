import {afterEach, describe, expect, it} from 'vitest';
import {AvatarComponent} from '@dota/components/avatar/avatar.component.ts';

if (!customElements.get('d-avatar-test')) customElements.define('d-avatar-test', AvatarComponent);

const render = (props: Partial<AvatarComponent> = {}) => {
  const element = document.createElement('d-avatar-test') as AvatarComponent;
  Object.assign(element, props);
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('AvatarComponent', () => {
  it('prefers an escaped image over initials and icon content', () => {
    const element = render({img: '/avatar?name=<x>', imgAlt: 'A & B'});
    const image = element.querySelector('avatar-wrapper img')!;
    expect(image.getAttribute('src')).toBe('/avatar?name=&lt;x&gt;');
    expect(image.getAttribute('alt')).toBe('A & B');
    expect(element.querySelector('avatar-wrapper span')).toBeNull();
  });

  it.each([
    ['Ada Lovelace', 'AL'],
    ['  single  ', 'S'],
    ['', ''],
  ])('derives initials from label "%s"', (label, initials) => {
    const element = render({label});
    if (initials) {
      expect(element.querySelector('avatar-wrapper span')?.textContent).toBe(initials);
    } else {
      expect(element.querySelector('avatar-wrapper dota-icon')).not.toBeNull();
    }
  });

  it('uses icon fallback and wraps the complete avatar in a chip when enabled', () => {
    const element = render({icon: 'person', color: 'blue', size: 'lg', variant: 'soft', isChip: true, chipText: 'Online'});
    const chip = element.querySelector('dota-chip');
    const icon = chip?.querySelector('dota-icon');
    expect(chip?.getAttribute('color')).toBe('blue');
    expect(chip?.getAttribute('text')).toBe('Online');
    expect(icon?.getAttribute('name')).toBe('person');
    expect(icon?.getAttribute('size')).toBe('lg');
  });

  it('uses configured image and chip color overrides without changing structure', () => {
    const element = render({
      img: 'avatar.png', isChip: true, chipColor: 'red',
      config: {image: 'custom-image'},
    });
    expect(element.querySelector('dota-chip')?.getAttribute('color')).toBe('red');
    expect(element.querySelector('img')?.getAttribute('class')).toContain('custom-image');
  });
});
