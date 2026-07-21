import {afterEach, describe, expect, it} from 'vitest';
import {DotaSlideComponent} from '@dota/components/carousel/dota-slide/dota-slide.component.ts';

if (!customElements.get('dota-slide-test')) customElements.define('dota-slide-test', DotaSlideComponent);
afterEach(() => {
  document.body.innerHTML = '';
});
describe('DotaSlideComponent', () => {
  it('renders captured content in a full-size wrapper', () => {
    const el = document.createElement('dota-slide-test') as DotaSlideComponent;
    el.content = '<p>Slide</p>';
    expect(el.render()).toContain('w-full h-full');
    expect(el.render()).toContain('Slide');
  });
  it('uses a configured container class', () => {
    const el = document.createElement('dota-slide-test') as DotaSlideComponent;
    el.content = 'content';
    el.config = {container: 'custom-slide'};
    expect(el.render()).toContain('custom-slide');
  });
});
