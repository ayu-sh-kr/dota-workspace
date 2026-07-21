import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {OrbBackgroundComponent} from '@dota/components/animations/orb/orb-background.component.ts';
import type {OrbitPosition} from '@dota/components/animations/orb/orb-background.component.ts';

if (!customElements.get('orb-background-test')) customElements.define('orb-background-test', OrbBackgroundComponent);

const render = (props: Partial<OrbBackgroundComponent> = {}) => {
  const element = document.createElement('orb-background-test') as OrbBackgroundComponent;
  Object.assign(element, props);
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

const createContext = () => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
} as unknown as CanvasRenderingContext2D);

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
});

describe('OrbBackgroundComponent', () => {
  it.each<[OrbitPosition, string, string]>([
    ['corner', 'fixed', 'bottom-[-50rem]'],
    ['center', 'absolute', 'top-1/2'],
  ])('selects the %s position branch', (orbitPosition, positioning, glowPosition) => {
    const element = render({orbitPosition});
    expect(element.firstElementChild?.className).toContain(positioning);
    expect(element.querySelector('#orb-glow')?.className).toContain(glowPosition);
  });

  it('maps size, color, particle count, and direction into rendered output and loop setup', () => {
    const element = render({orbitSize: 'xl', orbitColor: 'cyan', orbitCount: 6, orbitDirection: 'clockwise'});
    element.connectedCallback();
    expect(element.querySelector('#orb-glow')?.className).toContain('h-[140rem]');
    expect(element.querySelector('#orb-glow')?.getAttribute('style')).toContain('rgba');
    expect(element.querySelector('#orb-particles')).not.toBeNull();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('disconnects repeatedly without retaining particle or theme observers', () => {
    const element = render();
    expect(() => element.disconnectedCallback()).not.toThrow();
    expect(() => element.disconnectedCallback()).not.toThrow();
  });

  it('renders a particle frame for constant-size clockwise center orbits', () => {
    const callbacks: FrameRequestCallback[] = [];
    const context = createContext();
    const raf = vi.mocked(window.requestAnimationFrame);
    raf.mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);

    const element = render({
      orbitPosition: 'center',
      orbitDirection: 'clockwise',
      orbitSizeMode: 'constant',
      orbitCount: 2,
      orbitParticleGap: 180,
    });
    const canvas = element.querySelector<HTMLCanvasElement>('#orb-particles')!;
    Object.defineProperty(canvas.parentElement, 'offsetWidth', {configurable: true, value: 640});
    Object.defineProperty(canvas.parentElement, 'offsetHeight', {configurable: true, value: 360});

    element.connectedCallback();
    callbacks.shift()?.(1);
    callbacks.shift()?.(2);
    callbacks.shift()?.(3);

    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();

    element.disconnectedCallback();
    expect(raf).toHaveBeenCalled();
  });

  it('rebuilds glow colors when the document switches to dark mode', async () => {
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.mocked(window.requestAnimationFrame);
    raf.mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });

    const element = render({orbitGlowColor: 'cyan'});
    element.connectedCallback();
    callbacks.shift()?.(1);
    callbacks.shift()?.(2);

    const glow = element.querySelector<HTMLElement>('#orb-glow')!;
    const lightBackground = glow.getAttribute('style');

    document.documentElement.classList.add('dark');
    await flush();

    expect(glow.getAttribute('style')).not.toBe(lightBackground);
    element.disconnectedCallback();
  });
});
