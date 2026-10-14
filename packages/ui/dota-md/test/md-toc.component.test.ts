import {afterEach, describe, expect, it} from 'vitest';
import {MdTocComponent} from '@dota/components/md-toc.component.ts';
import {MDService} from '@dota/services/md.service.ts';

if (!customElements.get('md-toc')) customElements.define('md-toc', MdTocComponent);

/** Waits for Dota's asynchronous initialization to finish. */
const initialized = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MdTocComponent', () => {
  it('adopts prerendered entries so it renders them again without an md:render event', async () => {
    const source = document.createElement('md-toc') as MdTocComponent;
    document.body.append(source);
    await initialized();
    source.onRender({name: 'md:render', data: MDService.render('# Guide\n\n## Install\n\n## Use')});
    const prerendered = source.innerHTML;
    document.body.innerHTML = '';

    const host = document.createElement('div');
    host.innerHTML = `<md-toc>${prerendered}</md-toc>`;
    document.body.append(host);
    await initialized();
    const toc = host.querySelector('md-toc') as MdTocComponent;
    toc.updateHTML();

    expect([...toc.querySelectorAll<HTMLElement>('[data-toc-id]')].map((link) => link.dataset.tocId))
      .toEqual(['guide', 'install', 'use']);
  });
});
