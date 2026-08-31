import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ColorPickerComponent} from '@dota/components/docs/color-picker.component.ts';
import {DocHeaderComponent} from '@dota/components/docs/doc-header.component.ts';
import {LocalStorageService} from '@dota/service/local-storage.service.ts';
import {IconsComponent} from '@ayu-sh-kr/dota-ui';

if (!customElements.get('color-picker-test')) {
  customElements.define('color-picker-test', ColorPickerComponent);
}
if (!customElements.get('doc-header-test')) {
  customElements.define('doc-header-test', DocHeaderComponent);
}
if (!customElements.get('dota-icon')) {
  customElements.define('dota-icon', IconsComponent);
}
if (!customElements.get('dota-popover')) {
  customElements.define('dota-popover', class extends HTMLElement {
    connectedCallback(): void {
      this.innerHTML = this.innerHTML;
    }

    close(): void {
      this.dataset.closed = '';
    }
  });
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.spyOn(LocalStorageService, 'get').mockReturnValue(null);
  vi.spyOn(LocalStorageService, 'add').mockImplementation(() => undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('ColorPickerComponent', () => {
  it('moves its active ring to the selected swatch', async () => {
    const popover = document.createElement('dota-popover');
    popover.setAttribute('anchored-selector', 'color-picker');
    const picker = document.createElement('color-picker-test') as ColorPickerComponent;
    document.body.append(popover, picker);
    await flush();

    const indigo = picker.querySelector<HTMLElement>('[data-color="indigo"]');
    const rose = picker.querySelector<HTMLElement>('[data-color="rose"]');
    rose?.click();
    await flush();

    expect(picker.currentColor).toBe('rose');
    expect(picker.getAttribute('current-color')).toBe('rose');
    expect(picker.querySelector('[data-color="rose"]')).toBe(rose);
    expect(rose?.classList.contains('ring-2')).toBe(true);
    expect(indigo?.classList.contains('ring-2')).toBe(false);
    expect(popover.hasAttribute('data-closed')).toBe(true);
    expect(LocalStorageService.add).toHaveBeenCalledWith('docs-color', 'rose');
  });

  it('updates the retained header icon host after a color selection', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('<svg><path/></svg>', {status: 200}),
    );
    const header = document.createElement('doc-header-test') as DocHeaderComponent;
    const picker = document.createElement('color-picker-test') as ColorPickerComponent;
    document.body.append(header, picker);
    await flush();

    const indicator = header.querySelector<IconsComponent>('dota-icon');
    picker.querySelector<HTMLElement>('[data-color="rose"]')?.click();
    await flush();

    expect(header.color).toBe('rose');
    expect(header.querySelector('dota-icon')).toBe(indicator);
    expect(indicator?.getAttribute('color')).toBe('rose');
  });
});
