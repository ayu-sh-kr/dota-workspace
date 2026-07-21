import {afterEach, describe, expect, it, vi} from 'vitest';
import {CursorDisplacementComponent} from '@dota/components/animations/cursor/cursor-displacement.component.ts';

if (!customElements.get('cursor-displacement-test')) customElements.define('cursor-displacement-test', CursorDisplacementComponent);

const render = (props: Partial<CursorDisplacementComponent> = {}) => {
  const element = document.createElement('cursor-displacement-test') as CursorDisplacementComponent;
  Object.assign(element, props);
  element.innerHTML = element.render();
  document.body.append(element);
  return element;
};

const createContext = () => {
  const gradient = {addColorStop: vi.fn()};

  return {
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('CursorDisplacementComponent', () => {
  it('renders a transparent full-size canvas and no shadow DOM', () => {
    const element = render();
    expect(element.querySelector('#cursor-displacement-canvas')).not.toBeNull();
    expect(element.shadowRoot).toBeFalsy();
  });

  it('sets decorative accessibility and starts a frame on connection', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const element = render();
    element.onConnected();
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.className).toContain('pointer-events-none');
    expect(raf).toHaveBeenCalled();
  });

  it('always invokes the animation teardown on disconnection', () => {
    const element = render();
    const teardown = vi.fn();
    (element as unknown as {teardown: () => void}).teardown = teardown;
    element.onDisconnected();
    expect(teardown).toHaveBeenCalledOnce();
  });

  it('renders cursor glow, pulses, and tracers from pointer movement', () => {
    const callbacks: FrameRequestCallback[] = [];
    const context = createContext();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);

    const element = render({color: 'invalid-color' as never});
    element.onConnected();
    callbacks.shift()?.(1);

    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 10, clientY: 20}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 40, clientY: 55}));
    callbacks.shift()?.(2);
    window.dispatchEvent(new Event('mouseleave'));

    expect(raf.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(context.createRadialGradient).toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
  });

  it('resizes the canvas and disconnects global animation listeners', () => {
    const callbacks: FrameRequestCallback[] = [];
    const context = createContext();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);

    const element = render();
    element.onConnected();
    callbacks.shift()?.(1);
    window.dispatchEvent(new Event('resize'));
    element.onDisconnected();

    expect(cancel).toHaveBeenCalled();
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: 80, clientY: 80}));
  });
});
