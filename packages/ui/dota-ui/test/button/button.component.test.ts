import {afterEach, describe, expect, it} from 'vitest';
import {ButtonComponent} from '@dota/components/button/button.component.ts';

if (!customElements.get('dota-button-test')) customElements.define('dota-button-test', ButtonComponent);
const render = (props: Partial<ButtonComponent> = {}, content = 'Child') => {
  const el = document.createElement('dota-button-test') as ButtonComponent;
  Object.assign(el, props); el.content = content; el.innerHTML = el.render(); document.body.append(el); return el;
};
afterEach(() => { document.body.innerHTML = ''; });

describe('ButtonComponent', () => {
  it('renders native type, label, classes, and escaped accessible label', () => {
    const el = render({label: 'Save', type: 'submit', size: 'lg', rounded: 'xl', ariaLabel: 'Save & close'});
    const button = el.querySelector('button')!;
    expect(button.type).toBe('submit'); expect(button.textContent).toContain('Save');
    expect(button.className).toContain('min-h-11'); expect(button.className).toContain('rounded-xl');
    expect(button.getAttribute('aria-label')).toBe('Save & close');
  });

  it('renders leading/forward icons and a loading indicator while disabling the control', () => {
    const el = render({icon: 'check', iconPosition: 'forward', loading: true, animation: 'fill', animationColor: 'blue'});
    const button = el.querySelector('button')!;
    expect(button.disabled).toBe(true); expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('svg')).not.toBeNull(); expect(button.querySelector('dota-icon')?.getAttribute('name')).toBe('check');
    expect(button.className).toContain('buttonFill'); expect(button.className).toContain('before:bg-blue-500');
  });

  it('falls back for invalid tokens and applies partial style overrides', () => {
    const el = render({color: 'invalid' as never, variant: 'invalid' as never, size: 'invalid' as never, rounded: 'invalid' as never, type: 'invalid' as never, config: {base: 'custom-base', label: 'custom-label'}});
    expect(el.querySelector('button')?.type).toBe('button'); expect(el.querySelector('button')?.className).toContain('custom-base');
    expect(el.querySelector('span')?.className).toBe('custom-label');
  });
});
