import {afterEach, describe, expect, it} from 'vitest';
import {BlobsComponent} from '@dota/components/animations/blobs/blobs.component.ts';

if (!customElements.get('blob-animation-test')) customElements.define('blob-animation-test', BlobsComponent);

const render = () => {
  const element = document.createElement('blob-animation-test') as BlobsComponent;
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('BlobsComponent', () => {
  it('renders the decorative wrapper, three animated blobs, and content slot', () => {
    const element = render();
    expect(element.querySelector('.bg-gray-50')).not.toBeNull();
    expect(element.querySelectorAll('.animate-blob')).toHaveLength(3);
    expect(element.querySelector('.relative')).not.toBeNull();
  });

  it('preserves the component’s light-DOM rendering contract', () => {
    const element = render();
    expect(element.shadowRoot).toBeFalsy();
    expect(element.querySelector('.mix-blend-multiply')).not.toBeNull();
  });
});
