import {afterEach, describe, expect, it} from 'vitest';
import {ChipComponent} from '@dota/components/chip/chip.component.ts';

if (!customElements.get('dota-chip-test')) customElements.define('dota-chip-test', ChipComponent);
const render = (props: Partial<ChipComponent> = {}, content = '<span>Body</span>') => {
  const el = document.createElement('dota-chip-test') as ChipComponent;
  Object.assign(el, props);
  el.content = content;
  el.innerHTML = el.render();
  document.body.append(el);
  return el;
};
afterEach(() => {
  document.body.innerHTML = '';
});
describe('ChipComponent', () => {
  it('renders text, content, position, and color tokens', () => {
    const el = render({text: 'New', position: 'bottom-left', color: 'blue'});
    const chip = el.querySelector('span')!;
    expect(chip.textContent?.trim()).toBe('New');
    expect(chip.className).toContain('bottom-0');
    expect(chip.className).toContain('left-0');
    expect(chip.className).toContain('bg-blue-500');
    expect(el.textContent).toContain('Body');
  });
  it('uses the compact size when text is absent and falls back invalid tokens', () => {
    const el = render({text: '', position: 'invalid' as never, color: 'invalid' as never});
    const chip = el.querySelector('span')!;
    expect(chip.className).toContain('top-0');
    expect(chip.className).toContain('right-0');
    expect(chip.className).toContain('bg-yellow-500');
    expect(chip.className).toContain('size-2');
  });
  it.each([['top-right', 'top-0 right-0'], ['top-left', 'top-0 left-0'], ['bottom-right', 'bottom-0 right-0'], ['bottom-left', 'bottom-0 left-0']] as const)('supports %s placement', (position, utilities) => {
    const el = render({text: '1', position});
    expect(el.querySelector('span')?.className).toContain(utilities);
  });
});
