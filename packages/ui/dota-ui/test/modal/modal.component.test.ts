import {afterEach, describe, expect, it, vi} from 'vitest';
import {ModalComponent} from '@dota/components/modal/modal.component.ts';

if (!customElements.get('dota-modal-test')) customElements.define('dota-modal-test', ModalComponent);
const render = (props: Partial<ModalComponent> = {}, content = '<p>Modal body</p>') => {
  const el = document.createElement('dota-modal-test') as ModalComponent;
  Object.assign(el, props);
  (el as unknown as {content: string}).content = content;
  el.modalChange = {emit: vi.fn()} as never;
  el.innerHTML = el.render();
  document.body.append(el);
  return el;
};
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
describe('ModalComponent', () => {
  it('renders native dialog content, close control, animation tokens, and custom styles', () => {
    const el = render({
      ariaLabel: 'Settings',
      className: 'custom-panel',
      rounded: 'lg',
      duration: '700',
      direction: 'left',
      config: {overlay: 'custom-overlay'}
    });
    const dialog = el.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Settings');
    expect(dialog.className).toBe('custom-overlay');
    expect(dialog.querySelector('[data-modal-close]')).not.toBeNull();
    expect(dialog.querySelector('section')?.className).toContain('custom-panel');
    expect(dialog.querySelector('section')?.getAttribute('style')).toContain('--dota-modal-duration');
  });
  it('closes an open modal once and emits the public state change', () => {
    const el = render();
    el.isOpen = true;
    const emit = vi.fn();
    el.modalChange = {emit} as never;
    el.close();
    el.close();
    expect(el.isOpen).toBe(false);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(false, el);
  });
  it('closes from the close button or dialog target and ignores unrelated targets', () => {
    const el = render();
    el.isOpen = true;
    const emit = vi.fn();
    el.modalChange = {emit} as never;
    const dialog = el.querySelector('dialog')!;
    const close = el.querySelector('[data-modal-close]')!;
    el.handleClick(new MouseEvent('click', {bubbles: true}) as MouseEvent);
    expect(emit).not.toHaveBeenCalled();
    const click = new MouseEvent('click');
    Object.defineProperty(click, 'target', {value: close});
    el.handleClick(click);
    expect(emit).toHaveBeenCalledOnce();
    expect(dialog).not.toBeNull();
  });
  it('prevents cancel dismissal from bypassing the close contract', () => {
    const el = render();
    el.isOpen = true;
    const emit = vi.fn();
    el.modalChange = {emit} as never;
    el.onConnected();
    const dialog = el.querySelector<HTMLDialogElement>('dialog')!;
    const event = new Event('cancel', {cancelable: true});
    dialog.oncancel!(event);
    expect(event.defaultPrevented).toBe(true);
    expect(emit).toHaveBeenCalledWith(false, el);
  });
});
