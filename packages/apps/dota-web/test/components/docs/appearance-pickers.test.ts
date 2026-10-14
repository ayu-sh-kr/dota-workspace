import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApplicationEventService} from '@ayu-sh-kr/dota-wrap/core';
import {LocalStorageService} from '@dota/service/local-storage.service.ts';
import {DocsThemePickerComponent} from '@dota/components/docs/docs-theme-picker.component.ts';
import {DocsAccentPickerComponent} from '@dota/components/docs/docs-accent-picker.component.ts';

if (!customElements.get('docs-theme-picker')) customElements.define('docs-theme-picker', DocsThemePickerComponent);
if (!customElements.get('docs-accent-picker')) customElements.define('docs-accent-picker', DocsAccentPickerComponent);

/** Lets Dota's asynchronous init and event delivery settle. */
const settle = () => new Promise(resolve => setTimeout(resolve));

/** Connects both pickers and returns their menus. */
const mount = async () => {
  document.body.innerHTML = '<docs-theme-picker></docs-theme-picker><docs-accent-picker></docs-accent-picker>';
  await settle();
  const theme = document.querySelector('docs-theme-picker')!;
  const accent = document.querySelector('docs-accent-picker')!;
  return {theme, accent, themeMenu: theme.querySelector('details')!, accentMenu: accent.querySelector('details')!};
};

const publish = (name: 'md:theme-change' | 'md:color-change', data: object) =>
  ApplicationEventService.getInstance().getPublisher().publishAsync({name, data} as never);

beforeEach(() => {
  vi.spyOn(LocalStorageService, 'get').mockReturnValue(null);
  vi.spyOn(LocalStorageService, 'add').mockImplementation(() => undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('DocsThemePickerComponent', () => {
  it('stores and publishes a picked theme, then reflects it from the event', async () => {
    const {theme, themeMenu} = await mount();
    themeMenu.open = true;

    theme.querySelector<HTMLElement>('[data-value="github"]')!.click();
    await settle();

    expect(LocalStorageService.add).toHaveBeenCalledWith('docs-theme', 'github');
    expect(theme.querySelector('[data-current]')?.textContent).toBe('GitHub');
    expect(theme.querySelector('[data-value="github"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(theme.querySelector('[data-value="flat"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(themeMenu.open).toBe(false);
  });

  it('follows a theme published by someone else and ignores unknown themes', async () => {
    const {theme} = await mount();

    await publish('md:theme-change', {theme: 'apple'});
    await publish('md:theme-change', {theme: 'unknown'});
    await settle();

    expect(theme.querySelector('[data-current]')?.textContent).toBe('Apple');
  });

  it('republishes a valid saved theme on connection', async () => {
    vi.mocked(LocalStorageService.get).mockImplementation(key => key === 'docs-theme' ? 'material' : null);
    const {theme} = await mount();
    await settle();

    expect(theme.querySelector('[data-current]')?.textContent).toBe('Material');
  });
});

describe('DocsAccentPickerComponent', () => {
  it('stores and publishes a picked accent, then reflects it from the event', async () => {
    const {accent} = await mount();

    accent.querySelector<HTMLElement>('[data-value="rose"]')!.click();
    await settle();

    expect(LocalStorageService.add).toHaveBeenCalledWith('docs-color', 'rose');
    expect(accent.querySelector('[data-current]')?.classList.contains('bg-rose-500')).toBe(true);
    expect(accent.querySelector('[data-value="rose"]')?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('appearance menus', () => {
  it('keep only one menu open and close on outside click or Escape', async () => {
    const {themeMenu, accentMenu} = await mount();

    themeMenu.open = true;
    accentMenu.querySelector('summary')!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    expect(themeMenu.open).toBe(false);

    accentMenu.open = true;
    document.body.click();
    expect(accentMenu.open).toBe(false);

    themeMenu.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(themeMenu.open).toBe(false);
  });
});
