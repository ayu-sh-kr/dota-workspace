import {afterEach, describe, expect, it, vi} from 'vitest';
import {DotaCarouselComponent} from '@dota/components/carousel/dota-carousel/dota-carousel.component.ts';

if (!customElements.get('dota-carousel-test')) customElements.define('dota-carousel-test', DotaCarouselComponent);
const render = (props: Partial<DotaCarouselComponent> = {}) => {
  const el = document.createElement('dota-carousel-test') as DotaCarouselComponent;
  Object.assign(el, props);
  el.dotaSlides = ['A', 'B', 'C'];
  el.innerHTML = el.render();
  document.body.append(el);
  return el;
};
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
describe('DotaCarouselComponent', () => {
  it('renders indicators and navigation according to configuration', () => {
    const el = render({indicator: 'number', navigation: 'always', index: 1, gapPerSlide: 'lg'});
    expect(el.textContent).toContain('2 / 3');
    expect(el.querySelectorAll('button')).toHaveLength(2);
    expect(el.querySelector('.carousel-slide')?.className).toContain('gap-6');
  });
  it('moves within bounds and supports looping navigation', () => {
    const el = render({index: 0, loop: false});
    el.slidePrev();
    expect(el.index).toBe(0);
    el.slideNext();
    expect(el.index).toBe(1);
    el.toEnd();
    expect(el.index).toBe(2);
    el.slideNext();
    expect(el.index).toBe(2);
    el.loop = true;
    el.slideNext();
    expect(el.index).toBe(0);
    el.toSlide(2);
    expect(el.index).toBe(2);
    el.toSlide(99);
    expect(el.index).toBe(2);
  });
  it('renders stacked animation modes and pauses autoplay by clearing its timer', () => {
    const el = render({animation: 'fade', autoplay: true, interval: 100});
    const clear = vi.spyOn(globalThis, 'clearInterval');
    el.afterViewInit();
    expect(el.querySelector('.carousel-stacked')).not.toBeNull();
    expect(el.innerHTML).toContain('carousel-fade-in');
    el.pause();
    expect(clear).toHaveBeenCalled();
  });

  it('renders an empty fallback when no slides are available', () => {
    const el = render();
    el.dotaSlides = [];

    expect(el.render()).toBe('<div></div>');
  });

  it('renders icon indicators, disabled navigation, and configured visual slots', () => {
    const el = render({
      indicator: 'icon',
      navigation: 'auto',
      config: {
        container: 'custom-container',
        indicators: {active: 'custom-active'},
        navigation: {disabled: 'custom-disabled'},
      },
    });

    const previous = el.render();
    el.innerHTML = previous;
    const indicators = el.querySelectorAll('#indicators button');

    expect(previous).toContain('custom-container');
    expect(indicators).toHaveLength(3);
    expect(indicators[0].className).toContain('custom-active');
    expect(el.render()).toContain('custom-disabled');

    el.indicator = 'none';
    el.navigation = 'never';

    expect(el.render()).not.toContain('id="indicators"');
    expect(el.render()).not.toContain('id="prev-btn"');
  });

  it.each([
    ['fade', 'carousel-fade-in'],
    ['zoom', 'carousel-zoom-in'],
    ['flip', 'carousel-flip-in'],
  ] as const)('renders the %s stacked animation keyframes', (animation, keyframe) => {
    const el = render({animation, index: 1, draggable: true});
    const rendered = el.render();

    expect(rendered).toContain('carousel-stacked');
    expect(rendered).toContain(keyframe);
    expect(rendered).toContain('cursor-grab');
    expect(rendered).toContain('hidden');
  });

  it('supports keyboard navigation, hover pause, and autoplay restart', () => {
    vi.useFakeTimers();
    const el = render({autoplay: true, interval: 100, pauseOnHover: true});
    el.afterViewInit();

    vi.advanceTimersByTime(100);
    expect(el.index).toBe(1);

    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(300);
    expect(el.index).toBe(1);

    el.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    expect(el.index).toBe(2);

    el.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(100);
    expect(el.index).toBe(2);

    vi.useRealTimers();
  });

  it('moves slides from button handlers and drag gestures', () => {
    const el = render({draggable: true});
    el.afterViewInit();

    el.handleNextClick();
    expect(el.index).toBe(1);
    el.handlePrevClick();
    expect(el.index).toBe(0);

    const track = el.querySelector<HTMLElement>('.carousel-track')!;
    track.dispatchEvent(new MouseEvent('mousedown', {clientX: 160}));
    track.dispatchEvent(new MouseEvent('mouseup', {clientX: 80}));
    expect(el.index).toBe(1);

    const touchesStart = new Event('touchstart');
    Object.defineProperty(touchesStart, 'touches', {value: [{clientX: 160}]});
    const touchesEnd = new Event('touchend');
    Object.defineProperty(touchesEnd, 'changedTouches', {value: [{clientX: 230}]});
    track.dispatchEvent(touchesStart);
    track.dispatchEvent(touchesEnd);
    expect(el.index).toBe(0);
  });

  it('handles multi-view bounds and safe invalid animation fallbacks', () => {
    const el = render({slidesPerView: 2, index: 0, loop: false, animation: 'unknown' as never});

    el.slidePrev();
    expect(el.index).toBe(0);
    el.toEnd();
    expect(el.index).toBe(1);
    el.slideNext();
    expect(el.index).toBe(1);
    el.toSlide(-1);
    expect(el.index).toBe(1);
    el.toSlide(99);
    expect(el.index).toBe(1);
    expect(el.render()).toContain('style="animation: ;"');
  });
});
