import {afterEach, describe, expect, it, vi} from 'vitest';
import {CloudChamberComponent} from '@dota/components/animations/cloud/cloud-chamber.component.ts';

if (!customElements.get('cloud-chamber-test')) customElements.define('cloud-chamber-test', CloudChamberComponent);

const render = (props: Partial<CloudChamberComponent> = {}) => {
  const element = document.createElement('cloud-chamber-test') as CloudChamberComponent;
  Object.assign(element, props);
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

const createContext = () => {
  const gradient = {addColorStop: vi.fn()};

  return {
    clearRect: vi.fn(),
    createImageData: vi.fn(() => ({data: new Uint8ClampedArray(180 * 110 * 4)})),
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('CloudChamberComponent', () => {
  it('renders one full-viewport transparent canvas', () => {
    const element = render();
    expect(element.querySelectorAll('#cloud-chamber-canvas')).toHaveLength(1);
    expect(element.querySelector('canvas')?.className).toContain('absolute');
  });

  it('normalizes invalid numeric inputs before starting its connected effect', () => {
    const element = render({vaporIntensity: 'bad', vaporDensity: 'Infinity', vaporGlow: '0'});
    expect(() => element.onConnected()).not.toThrow();
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.style.position).toBe('fixed');
    element.onDisconnected();
  });

  it('disconnects safely when no animation teardown was created', () => {
    const element = render();
    expect(() => element.onDisconnected()).not.toThrow();
  });

  it('initializes a canvas loop, renders a frame, responds to resize, and tears down', () => {
    const callbacks: FrameRequestCallback[] = [];
    const context = createContext();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);

    const element = render({vaporIntensity: '0', vaporDensity: '4', vaporGlow: '2'});
    element.onConnected();
    callbacks.shift()?.(1);
    callbacks.shift()?.(2);
    window.dispatchEvent(new Event('resize'));

    expect(raf.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(context.createImageData).toHaveBeenCalledWith(180, 110);
    expect(context.putImageData).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();

    element.onDisconnected();

    expect(cancel).toHaveBeenCalled();
  });
});
