import {afterEach, describe, expect, it, vi} from 'vitest';
import {PopoverComponent} from '@dota/components/popover/popover.component.ts';

const floatingUiMocks = vi.hoisted(() => ({
  autoUpdate: vi.fn(() => vi.fn()),
  computePosition: vi.fn().mockResolvedValue({x: 24, y: 48}),
  flip: vi.fn(() => ({name: 'flip'})),
  offset: vi.fn((value: number) => ({name: 'offset', options: {value}})),
  shift: vi.fn(() => ({name: 'shift'})),
}));

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: floatingUiMocks.autoUpdate,
  computePosition: floatingUiMocks.computePosition,
  flip: floatingUiMocks.flip,
  offset: floatingUiMocks.offset,
  shift: floatingUiMocks.shift,
}));

if (!customElements.get('dota-popover-test')) {
  customElements.define('dota-popover-test', PopoverComponent);
}

const createPopover = (content = '<button type="button">Open</button>') => {
  const el = document.createElement('dota-popover-test') as PopoverComponent;
  (el as unknown as {content: string}).content = content;
  el.innerHTML = content;
  document.body.append(el);
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('PopoverComponent', () => {
  it('keeps position-only anchors passive when no content is authored', () => {
    const el = createPopover('');

    el.anchoredSelector = '#position-only-panel';
    el.onConnected();

    const panel = document.createElement('div');
    panel.id = 'position-only-panel';
    document.body.append(panel);
    el.onAttributeChanged({} as never);

    expect(el.getAttribute('role')).toBeNull();
    expect(panel.style.display).toBe('');
    expect(floatingUiMocks.autoUpdate).toHaveBeenCalledWith(el, panel, expect.any(Function));
  });

  it('creates a valid custom-element panel and removes only the owned panel on disconnect', () => {
    const el = createPopover();
    el.anchoredSelector = 'test-popover-panel';

    el.onConnected();

    const panel = document.querySelector<HTMLElement>('test-popover-panel')!;
    const trigger = el.querySelector('button')!;

    expect(panel).not.toBeNull();
    expect(panel.style.position).toBe('absolute');
    expect(panel.style.display).toBe('none');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);

    el.disconnectedCallback();

    expect(document.querySelector('test-popover-panel')).toBeNull();
  });

  it('replaces an owned panel when its custom-element selector changes', () => {
    const el = createPopover();
    el.anchoredSelector = 'first-popover-panel';
    el.onConnected();

    expect(document.querySelector('first-popover-panel')).not.toBeNull();

    el.anchoredSelector = 'second-popover-panel';
    el.onAttributeChanged({} as never);

    expect(document.querySelector('first-popover-panel')).toBeNull();
    expect(document.querySelector('second-popover-panel')).not.toBeNull();
  });

  it('toggles an existing panel and positions it with the configured placement and offset', async () => {
    const panel = document.createElement('div');
    panel.id = 'existing-popover-panel';
    document.body.append(panel);

    const el = createPopover();
    el.anchoredSelector = '#existing-popover-panel';
    el.placement = 'top-start';
    el.offset = 16;
    el.onConnected();

    el.toggle();
    await Promise.resolve();

    expect(panel.style.display).toBe('block');
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(panel.style.left).toBe('24px');
    expect(panel.style.top).toBe('48px');
    expect(floatingUiMocks.computePosition).toHaveBeenCalledWith(el, panel, expect.objectContaining({
      placement: 'top-start',
      middleware: expect.any(Array),
    }));

    el.toggle();

    expect(panel.style.display).toBe('none');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens a host trigger with the keyboard and closes from Escape while restoring focus', () => {
    const panel = document.createElement('div');
    panel.id = 'keyboard-popover-panel';
    document.body.append(panel);

    const el = createPopover('<span>Open</span>');
    el.anchoredSelector = '#keyboard-popover-panel';
    el.onConnected();
    const focus = vi.spyOn(el, 'focus');

    el.handleTriggerKeydown(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}));
    expect(panel.style.display).toBe('block');

    el.handleKeydown(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(panel.style.display).toBe('none');
    expect(focus).toHaveBeenCalledOnce();
  });

  it('closes on an outside click and ignores invalid selectors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const panel = document.createElement('div');
    panel.id = 'outside-popover-panel';
    document.body.append(panel);

    const el = createPopover();
    el.anchoredSelector = '#outside-popover-panel';
    el.onConnected();
    el.toggle();

    document.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(panel.style.display).toBe('none');

    const autoUpdateCallsBeforeInvalidSelector = floatingUiMocks.autoUpdate.mock.calls.length;
    const invalid = createPopover();
    invalid.anchoredSelector = '[';
    invalid.onConnected();

    expect(floatingUiMocks.autoUpdate).toHaveBeenCalledTimes(autoUpdateCallsBeforeInvalidSelector);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid anchored-selector'));
  });
});
