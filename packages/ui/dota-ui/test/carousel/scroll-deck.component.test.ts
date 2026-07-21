import {afterEach, describe, expect, it, vi} from 'vitest';
import {ScrollDeckComponent} from '@dota/components/carousel/scroll-deck/scroll-deck.component.ts';
import {ScrollDeckStyle} from '@dota/components/carousel/scroll-deck/scroll-deck.config.ts';

if (!customElements.get('scroll-deck-test')) {
  customElements.define('scroll-deck-test', ScrollDeckComponent);
}

const createDeck = (content = '<div data-scroll-slide>One</div><div data-scroll-slide>Two</div>') => {
  const el = document.createElement('scroll-deck-test') as ScrollDeckComponent;
  (el as unknown as {content: string}).content = content;
  el.innerHTML = el.render();
  document.body.append(el);
  el.afterViewInit();
  return el;
};

const setSlideOffsets = (el: ScrollDeckComponent, offsets: number[]) => {
  const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-scroll-slide]'));

  slides.forEach((slide, index) => {
    Object.defineProperty(slide, 'offsetLeft', {
      configurable: true,
      value: offsets[index] ?? 0,
    });
  });
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('ScrollDeckComponent', () => {
  it('renders the accessible scrolling region and preserves light-DOM slides', () => {
    const el = createDeck('<article data-scroll-slide>One</article>');
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;

    expect(el.style.display).toBe('block');
    expect(el.style.width).toBe('100%');
    expect(scroller.className).toContain(ScrollDeckStyle.scroller);
    expect(scroller.getAttribute('role')).toBe('region');
    expect(scroller.getAttribute('aria-label')).toBe('Scroll deck');
    expect(scroller.querySelector('article')?.textContent).toBe('One');
  });

  it('applies partial visual configuration and a custom accessible label', () => {
    const el = createDeck('<div data-scroll-slide>Configured</div>');
    el.config = {
      container: 'custom-container',
      content: 'custom-content',
    };
    el.ariaLabel = 'Featured stories';

    const rendered = el.render();

    expect(rendered).toContain('custom-container');
    expect(rendered).toContain(ScrollDeckStyle.scroller);
    expect(rendered).toContain('custom-content');
    expect(rendered).toContain('aria-label="Featured stories"');
  });

  it('moves to adjacent slides from scroller and active-window arrow keys', () => {
    const el = createDeck();
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;
    const scrollTo = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => undefined);

    setSlideOffsets(el, [0, 120]);
    scroller.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
    scroller.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}));

    scroller.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true}));

    expect(scrollTo).toHaveBeenNthCalledWith(1, {left: 120, behavior: 'smooth'});
    expect(scrollTo).toHaveBeenNthCalledWith(2, {left: 0, behavior: 'smooth'});
    expect(scrollTo).toHaveBeenNthCalledWith(3, {left: 120, behavior: 'smooth'});
  });

  it('ignores window arrows after focus leaves the deck and handles empty decks safely', () => {
    const el = createDeck('<div>Not a slide</div>');
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;
    const scrollTo = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => undefined);
    const outside = document.createElement('button');
    document.body.append(outside);

    scroller.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
    scroller.dispatchEvent(new FocusEvent('focusout', {relatedTarget: outside}));
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true}));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('snaps a significant drag to the next slide and resets drag styles', () => {
    const el = createDeck();
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;
    const scrollTo = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => undefined);

    Object.defineProperty(scroller, 'clientWidth', {configurable: true, value: 100});
    Object.defineProperty(scroller, 'scrollLeft', {configurable: true, writable: true, value: 0});
    setSlideOffsets(el, [0, 120]);

    scroller.dispatchEvent(new MouseEvent('mousedown', {button: 0, clientX: 100, bubbles: true, cancelable: true}));
    expect(scroller.classList.contains(ScrollDeckStyle.dragging)).toBe(true);

    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 60, bubbles: true, cancelable: true}));
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: 60, bubbles: true}));

    expect(scrollTo).toHaveBeenCalledWith({left: 120, behavior: 'auto'});
    expect(scroller.classList.contains(ScrollDeckStyle.dragging)).toBe(false);
    expect(scroller.style.scrollSnapType).toBe('');
    expect(scroller.style.scrollBehavior).toBe('');
  });

  it('does not start a drag for non-primary clicks or tiny movement', () => {
    const el = createDeck();
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;
    const scrollTo = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => undefined);

    scroller.dispatchEvent(new MouseEvent('mousedown', {button: 1, clientX: 100, bubbles: true}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 50, bubbles: true}));
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: 50, bubbles: true}));

    scroller.dispatchEvent(new MouseEvent('mousedown', {button: 0, clientX: 100, bubbles: true}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 97, bubbles: true}));
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: 97, bubbles: true}));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({left: 0, behavior: 'auto'});
  });

  it('removes event listeners when disconnected', () => {
    const el = createDeck();
    const scroller = el.querySelector<HTMLElement>('[data-scroll-deck-scroller]')!;
    const scrollTo = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => undefined);

    el.disconnectedCallback();
    scroller.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true}));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('returns safely when initialized without a rendered scroller', () => {
    const el = document.createElement('scroll-deck-test') as ScrollDeckComponent;

    expect(() => el.afterViewInit()).not.toThrow();
  });
});
