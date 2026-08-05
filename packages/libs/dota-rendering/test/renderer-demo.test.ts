import {diff, html, patch, render, update} from '@dota/main';

describe('renderer demo', () => {
  it('logs mount, diff, patch, and update behavior', () => {
    const root = document.createElement('div');
    const initialView = html`<dota-card title=${'before'}>Count: ${1}</dota-card>`;
    const instance = render(root, initialView);
    const elementBeforePatch = root.firstElementChild;

    const patchedView = html`<dota-card title=${'after'}>Count: ${2}</dota-card>`;
    const patchDiff = diff(initialView, patchedView);

    console.log('[dota-rendering] mount', {
      html: root.innerHTML,
      element: elementBeforePatch?.tagName
    });
    console.log('[dota-rendering] diff', {
      kind: patchDiff.kind,
      changedParts: patchDiff.changedParts.map(({index, previousValue, nextValue}) => ({
        index,
        previousValue,
        nextValue
      }))
    });

    const patchResult = patch(instance, patchedView);
    console.log('[dota-rendering] patch', {
      result: patchResult,
      preservedElement: root.firstElementChild === elementBeforePatch,
      html: root.innerHTML
    });

    const updatedView = html`<dota-card title=${'updated'}>Count: ${3}</dota-card>`;
    const updateResult = update(instance, updatedView);
    console.log('[dota-rendering] update', {
      result: updateResult,
      preservedElement: root.firstElementChild === elementBeforePatch,
      html: root.innerHTML
    });

    expect(patchDiff.kind).toBe('patch');
    expect(patchResult.kind).toBe('patch');
    expect(updateResult.kind).toBe('patch');
    expect(root.firstElementChild).toBe(elementBeforePatch);
    expect(root.querySelector('dota-card')?.getAttribute('data-dota-index')).toBe('0');
    expect(root.querySelector('dota-card')?.hasAttribute('data-dota-dynamic')).toBe(true);
    expect(root.querySelector('dota-card')?.getAttribute('data-dota-component')).toBe('dota-card');
    expect(root.querySelector('dota-card')?.getAttribute('title')).toBe('updated');
    expect(root.innerHTML.startsWith('<!--dota-component-start-->')).toBe(true);
    expect(root.innerHTML.endsWith('<!--dota-component-end-->')).toBe(true);
    expect(root.textContent).toBe('Count: 3');
  });
});
