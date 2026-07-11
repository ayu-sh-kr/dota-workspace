/**
 * Shared infrastructure for interactive blog diagrams.
 *
 * Keep domain drawing and hit testing in each component; this module owns the
 * generic canvas concerns that otherwise repeat across examples.
 */
export type Point = {
  x: number;
  y: number;
};

export type CanvasSize = {
  width: number;
  height: number;
  pixelRatio: number;
};

export type DiagramViewport = {
  scale: number;
  offset: Point;
};

export type DiagramPaletteBase = {
  background: string;
  grid: string;
  text: string;
  muted: string;
  node: string;
  nodeFaint: string;
  edge: string;
  active: string;
};

export type EventDisposer = () => void;

/**
 * Registers an event listener and returns the exact cleanup callback.
 * This keeps interactive examples explicit without duplicating teardown lists.
 */
export function listen(
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject | ((event: any) => void),
  options?: AddEventListenerOptions | boolean,
): EventDisposer {
  const listener = handler as EventListenerOrEventListenerObject;
  target.addEventListener(event, listener, options);
  return () => target.removeEventListener(event, listener, options);
}

/**
 * Resizes a 2D canvas for high-DPI displays while preserving CSS-pixel drawing.
 * The returned width and height are CSS pixels; the context transform handles DPR.
 */
export function resizeCanvasForDpr(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  minWidth: number,
  minHeight: number,
): CanvasSize {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(minWidth, rect.width);
  const height = Math.max(minHeight, rect.height);
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return {width, height, pixelRatio};
}

export function getCanvasPoint(canvas: HTMLCanvasElement, event: MouseEvent | PointerEvent | WheelEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function screenToWorld(point: Point, viewport: DiagramViewport): Point {
  return {
    x: (point.x - viewport.offset.x) / viewport.scale,
    y: (point.y - viewport.offset.y) / viewport.scale,
  };
}

export function worldToScreen(point: Point, viewport: DiagramViewport): Point {
  return {
    x: point.x * viewport.scale + viewport.offset.x,
    y: point.y * viewport.scale + viewport.offset.y,
  };
}

export function midpoint(left: Point, right: Point): Point {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

export function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distance(point, start);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("#")) {
    return color;
  }

  const hex = color.replace("#", "");
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function appendRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function createDiagramPaletteBase(): DiagramPaletteBase {
  const dark = document.documentElement.classList.contains("dark");

  return {
    background: dark ? "#020617" : "#fbfaf6",
    grid: dark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)",
    text: dark ? "#f8fafc" : "#0f172a",
    muted: dark ? "#94a3b8" : "#64748b",
    node: dark ? "#cbd5e1" : "#334155",
    nodeFaint: dark ? "rgba(203, 213, 225, 0.18)" : "rgba(51, 65, 85, 0.14)",
    edge: dark ? "#94a3b8" : "#64748b",
    active: dark ? "#f8fafc" : "#0f172a",
  };
}

export function drawGridBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: DiagramViewport,
  palette: Pick<DiagramPaletteBase, "background" | "grid">,
  baseSpacing: number,
  minSpacing: number = 1,
) {
  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = palette.grid;
  context.lineWidth = 1;

  const spacing = Math.max(minSpacing, baseSpacing * viewport.scale);
  const originX = viewport.offset.x % spacing;
  const originY = viewport.offset.y % spacing;

  for (let x = originX; x < width; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = originY; y < height; y += spacing) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}
