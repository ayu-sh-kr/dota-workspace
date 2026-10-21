import {afterEach, describe, expect, it} from 'vitest';
import {DarkModeButtonComponent} from '@dota/components/utils/buttons/dark-mode-button.component.ts';

if (!customElements.get('dark-mode-button')) customElements.define('dark-mode-button', DarkModeButtonComponent);

/** Lets Dota's asynchronous init and event delivery settle. */
const settle = () => new Promise(resolve => setTimeout(resolve));

const state = (host: Element) => ({
  icon: host.querySelector('dota-icon')?.getAttribute('name'),
  label: host.querySelector('button')?.getAttribute('aria-label'),
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.classList.remove('dark');
});

describe('DarkModeButtonComponent', () => {
  it('shows the dark theme once connected when the page is already dark', async () => {
    document.documentElement.classList.add('dark');
    document.body.innerHTML = '<dark-mode-button></dark-mode-button>';
    await settle();

    expect(state(document.querySelector('dark-mode-button')!)).toEqual({
      icon: 'material-symbols:dark-mode',
      label: 'Switch to light mode',
    });
  });

  it('follows themeChange events', async () => {
    document.body.innerHTML = '<dark-mode-button></dark-mode-button>';
    await settle();
    const host = document.querySelector('dark-mode-button')!;
    expect(state(host).icon).toBe('material-symbols:sunny-rounded');

    document.documentElement.classList.add('dark');
    window.dispatchEvent(new CustomEvent('themeChange', {detail: {isDarkMode: true}}));
    await settle();

    expect(state(host)).toEqual({icon: 'material-symbols:dark-mode', label: 'Switch to light mode'});
  });
});

describe('DarkModeButtonComponent hydration', () => {
  it('renders the light server markup before connecting, even on a dark page', () => {
    // Hydration adopts server HTML and treats the first client render as already applied, so
    // that render must match the light prerender; the live theme is applied after connecting.
    document.documentElement.classList.add('dark');
    const button = document.createElement('dark-mode-button') as DarkModeButtonComponent;

    const output = button.render() as unknown as {values: unknown[]};

    expect(output.values).toContain('material-symbols:sunny-rounded');
    expect(output.values).toContain('dark');
    expect(output.values).not.toContain('material-symbols:dark-mode');
  });
});
