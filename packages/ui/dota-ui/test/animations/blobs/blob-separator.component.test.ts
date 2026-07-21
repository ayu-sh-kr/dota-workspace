import {afterEach, describe, expect, it} from 'vitest';
import {BlobSeparatorComponent} from '@dota/components/animations/blobs/blob-separator.component.ts';

if (!customElements.get('blob-separator-test')) customElements.define('blob-separator-test', BlobSeparatorComponent);

const render = (props: Partial<BlobSeparatorComponent> = {}) => {
  const element = document.createElement('blob-separator-test') as BlobSeparatorComponent;
  Object.assign(element, props);
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('BlobSeparatorComponent', () => {
  it.each([
    ['left', 'left-0', 4, 1],
    ['right', 'right-0', 10, 15],
  ])('normalizes side, speed, and color placement: %s', (side, placement, speed, colorPlacement) => {
    const element = render({side, speed: side === 'right' ? 99 : 4, colorPlacement: side === 'right' ? -1 : 1});
    const root = element.querySelector('.blob-separator')!;
    expect(root.getAttribute('data-speed')).toBe(String(speed));
    expect(root.getAttribute('data-color-placement')).toBe(String(colorPlacement));
    expect(element.querySelector('.blob-separator-stack')?.className).toContain(placement);
  });

  it('creates three cached layers with glow and shape SVG copies', () => {
    const element = render({speed: 4, colorPlacement: 2});
    expect(element.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(element.querySelectorAll('.blob-separator-layer')).toHaveLength(3);
    expect(element.querySelectorAll('svg path[fill="currentColor"]')).toHaveLength(6);
    expect(element.querySelectorAll('[style*="--blob-duration"]')).toHaveLength(3);
  });
});
