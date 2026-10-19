/** Options for {@link startAnimationLoop}. */
export interface AnimationLoopOptions {
  /** Upper frame rate; frames that arrive sooner are skipped. Defaults to 60. */
  fps?: number;
  /**
   * Waits for the page `load` event plus an idle period before the first frame, so a
   * decorative loop never competes with startup and hydration. Defaults to `true`.
   */
  deferUntilIdle?: boolean;
}

/**
 * A gap this long between animation frames means drawing plus painting a frame is a long task.
 * The gap is measured instead of the draw call because canvas filters cost most at paint time.
 */
const SLOW_FRAME_INTERVAL_MS = 100;

/** Consecutive slow frames after which the loop keeps its last frame and stops. */
const SLOW_FRAME_LIMIT = 2;

/** Longest wait for an idle period before the loop starts anyway. */
const IDLE_TIMEOUT_MS = 2000;

/**
 * Runs `frame` on animation frames only while it can be seen.
 * The loop pauses while `target` is off screen or not rendered (for example `display: none`
 * at a breakpoint) and while the tab is hidden. With `prefers-reduced-motion` it draws a
 * single frame and stops, and on a device too slow to keep frames apart by less than
 * {@link SLOW_FRAME_INTERVAL_MS} it keeps the last frame and stops, so decoration never blocks input. Decorative canvas components share this so none of them spends
 * main-thread time on frames nobody sees.
 * @param target Element whose visibility gates the loop, normally the canvas.
 * @param frame Draws one frame; receives the number of frames drawn so far.
 * @param options Frame-rate cap and start deferral.
 * @returns Stops the loop and releases its observers and listeners.
 */
export function startAnimationLoop(
  target: Element,
  frame: (count: number) => void,
  options: AnimationLoopOptions = {}
): () => void {
  const minInterval = 1000 / (options.fps ?? 60);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let raf = 0;
  let count = 0;
  let last = -Infinity;
  let ready = !(options.deferUntilIdle ?? true);
  let intersecting = false;
  let stopped = false;
  let tooSlow = false;
  let previousTick: number | undefined;
  let slowFrames = 0;

  const tick = (time: number) => {
    raf = 0;
    if (!shouldRun()) return;
    slowFrames = previousTick !== undefined && time - previousTick > SLOW_FRAME_INTERVAL_MS ? slowFrames + 1 : 0;
    previousTick = time;
    if (slowFrames >= SLOW_FRAME_LIMIT) {
      tooSlow = true;
      return;
    }
    if (time - last >= minInterval - 1) {
      last = time;
      frame(count++);
      if (reducedMotion) return;
    }
    raf = requestAnimationFrame(tick);
  };

  const shouldRun = () => !stopped && !tooSlow && ready && intersecting && !document.hidden && !(reducedMotion && count > 0);

  const update = () => {
    if (!shouldRun() || raf !== 0) return;
    // A pause is not a slow frame: measure intervals afresh after resuming.
    previousTick = undefined;
    raf = requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(entries => {
    intersecting = entries[entries.length - 1].isIntersecting;
    update();
  });
  observer.observe(target);
  document.addEventListener("visibilitychange", update);

  let cancelStart = () => {};
  if (!ready) {
    cancelStart = whenIdleAfterLoad(() => {
      ready = true;
      update();
    });
  }

  return () => {
    stopped = true;
    cancelStart();
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}

/**
 * Calls `callback` once the document has loaded and the main thread is idle.
 * @param callback Invoked once.
 * @returns Cancels a pending call.
 */
function whenIdleAfterLoad(callback: () => void): () => void {
  let cancelled = false;
  let idleHandle: number | undefined;
  const scheduleIdle = () => {
    if (cancelled) return;
    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(callback, {timeout: IDLE_TIMEOUT_MS});
    } else {
      idleHandle = setTimeout(callback, 200) as unknown as number;
    }
  };

  if (document.readyState === "complete") scheduleIdle();
  else window.addEventListener("load", scheduleIdle, {once: true});

  return () => {
    cancelled = true;
    window.removeEventListener("load", scheduleIdle);
    if (idleHandle === undefined) return;
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
    else clearTimeout(idleHandle);
  };
}
