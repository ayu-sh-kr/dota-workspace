import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {startAnimationLoop} from '@dota/components/animations/animation-loop.ts';
import {intersectionCallbacks, visibleAnimationEnvironment} from '../setup/animation-environment.ts';

let frames: FrameRequestCallback[] = [];

/** Runs the pending animation frame at `time`. */
const runFrame = (time: number) => frames.shift()?.(time);

beforeEach(() => {
  visibleAnimationEnvironment();
  frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => frames.push(callback));
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('startAnimationLoop', () => {
  it('draws frames while the target is visible and pauses when it is hidden', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);

    runFrame(0);
    runFrame(20);
    intersectionCallbacks[0](false);
    runFrame(40);

    expect(frame).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(0);
    loop.stop();
  });

  it('skips frames that arrive sooner than the frame-rate cap', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame, {fps: 30});

    runFrame(0);
    runFrame(16);
    runFrame(33);

    expect(frame).toHaveBeenCalledTimes(2);
    loop.stop();
  });

  it('waits for an idle period before the first frame', () => {
    const idle: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => idle.push(callback));
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);

    expect(frames).toHaveLength(0);
    idle[0]();
    runFrame(0);

    expect(frame).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it('keeps the last frame and stops when frames keep arriving too far apart', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);

    runFrame(0);
    runFrame(150);
    runFrame(300);

    expect(frame).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(0);
    loop.stop();
  });

  it('does not count a pause as a slow frame', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);

    runFrame(0);
    intersectionCallbacks[0](false);
    runFrame(20);
    intersectionCallbacks[0](true);
    runFrame(5000);
    runFrame(5020);

    expect(frame).toHaveBeenCalledTimes(3);
    expect(frames).toHaveLength(1);
    loop.stop();
  });

  it('repaints once after invalidation without restarting a reduced-motion loop', () => {
    vi.stubGlobal('matchMedia', () => ({matches: true}));
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);
    runFrame(0);

    loop.invalidate();
    runFrame(16);

    expect(frame).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(0);
    loop.stop();
  });

  it('repaints a loop stopped for slow frames once it is invalidated', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);
    runFrame(0);
    runFrame(150);
    runFrame(300);

    loop.invalidate();
    runFrame(310);

    expect(frame).toHaveBeenCalledTimes(3);
    expect(frames).toHaveLength(0);
    loop.stop();
  });

  it('does not add frames when a running loop is invalidated', () => {
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);
    runFrame(0);

    loop.invalidate();
    runFrame(16);

    expect(frame).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(1);
    loop.stop();
  });

  it('repaints an invalidated hidden canvas when it becomes visible again', () => {
    vi.stubGlobal('matchMedia', () => ({matches: true}));
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);
    runFrame(0);
    intersectionCallbacks[0](false);

    loop.invalidate();
    expect(frames).toHaveLength(0);
    intersectionCallbacks[0](true);
    runFrame(50);

    expect(frame).toHaveBeenCalledTimes(2);
    loop.stop();
  });

  it('draws a single frame when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({matches: true}));
    const frame = vi.fn();
    const loop = startAnimationLoop(document.createElement('canvas'), frame);

    runFrame(0);

    expect(frame).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    loop.stop();
  });
});
