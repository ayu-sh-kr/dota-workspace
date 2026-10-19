import {afterEach, describe, expect, it, vi} from "vitest";
import {afterFirstPaint} from "../src/lazy-components";

const fcp = [{name: "first-contentful-paint"}] as PerformanceEntry[];

/** Stubs a Paint Timing API whose observer callback the test triggers. */
function stubPaintTiming(entries: PerformanceEntry[] = []) {
  const observers: Array<() => void> = [];
  vi.spyOn(performance, "getEntriesByType").mockImplementation(() => entries);
  vi.stubGlobal("PerformanceObserver", Object.assign(class {
    constructor(callback: () => void) { observers.push(callback); }
    observe() {}
    disconnect() {}
  }, {supportedEntryTypes: ["paint"]}));
  return {paint: () => { entries.push(...fcp); observers.forEach(callback => callback()); }};
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("afterFirstPaint", () => {
  it("resolves at once when the document has already painted", async () => {
    stubPaintTiming([...fcp]);
    await expect(afterFirstPaint()).resolves.toBeUndefined();
  });

  it("waits for the first contentful paint", async () => {
    const timing = stubPaintTiming();
    let done = false;
    const waiting = afterFirstPaint().then(() => { done = true; });

    await Promise.resolve();
    expect(done).toBe(false);
    timing.paint();
    await waiting;

    expect(done).toBe(true);
  });

  it("does not wait in a hidden tab, which records no paint", async () => {
    stubPaintTiming();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await expect(afterFirstPaint()).resolves.toBeUndefined();
  });

  it("gives up after a timeout so hydration always proceeds", async () => {
    vi.useFakeTimers();
    stubPaintTiming();
    const waiting = afterFirstPaint();

    vi.advanceTimersByTime(3000);

    await expect(waiting).resolves.toBeUndefined();
  });

  it("falls back to the next frame without the Paint Timing API", async () => {
    vi.spyOn(performance, "getEntriesByType").mockImplementation(() => []);
    vi.stubGlobal("PerformanceObserver", undefined);
    const frame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });

    await afterFirstPaint();

    expect(frame).toHaveBeenCalled();
  });
});
