import {afterEach, describe, expect, it} from 'vitest';
import {CardComponent, CardDescriptionComponent, CardFooterComponent, CardHeaderComponent, CardTitleComponent} from '@dota/components/card/card.component.ts';

const entries = [['dota-card-test', CardComponent], ['card-title-test', CardTitleComponent], ['card-header-test', CardHeaderComponent], ['card-description-test', CardDescriptionComponent], ['card-footer-test', CardFooterComponent]] as const;
for (const [tag, ctor] of entries) if (!customElements.get(tag)) customElements.define(tag, ctor);
afterEach(() => { document.body.innerHTML = ''; });

describe('card components', () => {
  it('renders CardComponent light-DOM content and custom classes', () => {
    const el = document.createElement('dota-card-test') as CardComponent; el.content = '<p>body</p>'; el.className = 'custom-card'; el.innerHTML = el.render();
    expect(el.querySelector('div')?.className).toBe('custom-card'); expect(el.textContent).toContain('body');
  });
  it('uses explicit title/header/description values and falls back to child content', () => {
    const title = document.createElement('card-title-test') as CardTitleComponent; title.title = 'Title'; title.className = 'large'; title.innerHTML = title.render();
    const header = document.createElement('card-header-test') as CardHeaderComponent; header.header = ''; header.innerHTML = '<b>Header</b>'; const headerMarkup = header.render();
    const desc = document.createElement('card-description-test') as CardDescriptionComponent; desc.description = 'Description'; desc.className = 'muted';
    expect(title.render()).toContain('Title'); expect(title.render()).toContain('large'); expect(headerMarkup).toContain('<b>Header</b>'); expect(desc.render()).toContain('Description');
  });
  it('renders footer content with its layout and class extension', () => {
    const el = document.createElement('card-footer-test') as CardFooterComponent; el.content = '<button>Action</button>'; el.className = 'mt-4';
    el.innerHTML = el.render(); expect(el.querySelector('footer')?.className).toContain('justify-center'); expect(el.querySelector('footer')?.className).toContain('mt-4');
  });
});
