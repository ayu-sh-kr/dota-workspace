import {afterEach, describe, expect, it} from 'vitest';
import {LightDomSlot} from '@dota/components/utils/light-dom-slot.ts';

const createHost = (markup: string) => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('LightDomSlot', () => {
  it('moves the original authored nodes into the rendered slot', () => {
    const host = createHost('<button type="button">Open</button> text');
    const button = host.querySelector('button');
    const slot = new LightDomSlot();

    slot.capture(host);
    expect(host.childNodes).toHaveLength(0);
    expect(slot.hasContent(host)).toBe(true);

    host.innerHTML = '<section><div data-dota-slot></div></section>';
    slot.restore(host);

    expect(host.querySelector('[data-dota-slot] button')).toBe(button);
    expect(host.querySelector('[data-dota-slot]')?.textContent).toBe('Open text');
  });

  it('leaves server-rendered children in place and reads them from the slot', () => {
    const host = createHost('<div data-dota-slot><b>Server</b></div>');
    host.setAttribute('data-dh-t', 'abc');
    const slot = new LightDomSlot();

    slot.capture(host);
    slot.restore(host);

    expect(host.innerHTML).toBe('<div data-dota-slot=""><b>Server</b></div>');
    expect(slot.hasContent(host)).toBe(true);
  });

  it('captures only once and treats whitespace as no content', () => {
    const host = createHost('  \n ');
    const slot = new LightDomSlot();

    slot.capture(host);
    host.innerHTML = '<span data-dota-slot></span><i>rendered</i>';
    slot.capture(host);

    expect(slot.hasContent(host)).toBe(false);
    expect(host.querySelector('i')).not.toBeNull();
  });
});
