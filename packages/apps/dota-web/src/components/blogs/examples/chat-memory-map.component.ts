import {AfterInit, BaseElement, Component, HTML, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {
  appendRoundedRect,
  clamp,
  createDiagramPaletteBase,
  distance,
  distanceToSegment,
  drawGridBackground,
  getCanvasPoint,
  listen,
  midpoint,
  resizeCanvasForDpr,
  screenToWorld,
  withAlpha,
  worldToScreen,
  type EventDisposer,
  type Point,
} from "./canvas-diagram.utils.ts";

type NodeKind = "session" | "memory" | "process";

type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  radius: number;
  cluster: string;
  note: string;
};

type GraphEdge = {
  from: string;
  to: string;
  label: string;
  relevance: number;
  implicit: boolean;
  note: string;
};

const BASE_NODES: GraphNode[] = [
  {id: "chat-1", label: "Chat 01", kind: "session", x: -430, y: -170, radius: 18, cluster: "sessions", note: "A conversation where the user states a durable preference."},
  {id: "chat-2", label: "Chat 02", kind: "session", x: -500, y: 40, radius: 16, cluster: "sessions", note: "A project-heavy session that produces reusable context."},
  {id: "chat-3", label: "Chat 03", kind: "session", x: -360, y: 170, radius: 15, cluster: "sessions", note: "Repeated corrections start shaping future behavior."},
  {id: "write", label: "Write", kind: "process", x: -120, y: -150, radius: 17, cluster: "loop", note: "Candidate facts are selected for persistence."},
  {id: "manage", label: "Manage", kind: "process", x: 20, y: 0, radius: 20, cluster: "loop", note: "Stored signals are merged, deduplicated, weakened, or refreshed."},
  {id: "read", label: "Read", kind: "process", x: -120, y: 150, radius: 17, cluster: "loop", note: "Only relevant memory is pulled into the next answer."},
  {id: "explicit", label: "Explicit", kind: "memory", x: 260, y: -190, radius: 20, cluster: "memory", note: "A visible saved memory created from direct user intent."},
  {id: "priming", label: "Priming", kind: "memory", x: 420, y: -70, radius: 18, cluster: "memory", note: "Recent themes quietly bias what feels relevant next."},
  {id: "reingest", label: "Reingest", kind: "memory", x: 380, y: 100, radius: 19, cluster: "memory", note: "Earlier output returns as input and carries state forward."},
  {id: "routine", label: "Routine", kind: "memory", x: 230, y: 210, radius: 17, cluster: "memory", note: "Repeated workflow becomes a procedural habit."},
  {id: "reply", label: "Reply", kind: "process", x: 560, y: 20, radius: 18, cluster: "output", note: "The next response is shaped by selected context."},
];

const EDGES: GraphEdge[] = [
  {from: "chat-1", to: "write", label: "preference", relevance: 0.92, implicit: false, note: "Explicit signal: the user directly asks for a preference to be remembered."},
  {from: "chat-2", to: "write", label: "project", relevance: 0.76, implicit: true, note: "Implicit signal: repeated project context becomes useful later."},
  {from: "chat-3", to: "read", label: "correction", relevance: 0.68, implicit: true, note: "Implicit signal: correction history changes the answer style."},
  {from: "write", to: "explicit", label: "saved", relevance: 0.9, implicit: false, note: "The selected fact becomes visible, editable saved memory."},
  {from: "write", to: "manage", label: "candidate", relevance: 0.72, implicit: true, note: "The system keeps a candidate only if it looks stable and useful."},
  {from: "manage", to: "priming", label: "topic bias", relevance: 0.66, implicit: true, note: "Recent themes nudge future completions without becoming a saved fact."},
  {from: "manage", to: "reingest", label: "loopback", relevance: 0.82, implicit: true, note: "Generated output can return as input and carry state through the loop."},
  {from: "manage", to: "routine", label: "procedure", relevance: 0.74, implicit: true, note: "Repeated steps become a learned workflow."},
  {from: "explicit", to: "read", label: "retrieve", relevance: 0.88, implicit: false, note: "Saved memory is read only when it fits the current request."},
  {from: "priming", to: "reply", label: "bias", relevance: 0.62, implicit: true, note: "The next reply leans toward recently reinforced topics."},
  {from: "reingest", to: "reply", label: "state", relevance: 0.78, implicit: true, note: "Recovered context can shift tone, choices, or assumptions."},
  {from: "routine", to: "reply", label: "habit", relevance: 0.7, implicit: true, note: "The assistant repeats an internalized procedure."},
  {from: "read", to: "reply", label: "context", relevance: 0.86, implicit: false, note: "Relevant memory becomes usable context for the response."},
];

type Palette = {
  background: string;
  grid: string;
  text: string;
  labelText: string;
  labelFill: string;
  labelStroke: string;
  muted: string;
  node: string;
  nodeFill: string;
  nodeFaint: string;
  edge: string;
  edgeFaint: string;
  edgeStrong: string;
  active: string;
};

type GraphTarget =
  | {kind: "node"; node: GraphNode; point: Point}
  | {kind: "edge"; edge: GraphEdge; point: Point};

const nodeById = (nodes: GraphNode[]) => new Map(nodes.map(node => [node.id, node]));

@Component({
  selector: "chat-memory-map",
  shadow: false,
})
export class ChatMemoryMapComponent extends BaseElement {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private anchor: HTMLElement | null = null;
  private popup: HTMLElement | null = null;
  private disposers: EventDisposer[] = [];
  private nodes: GraphNode[] = BASE_NODES.map(node => ({...node}));
  private scale = 0.88;
  private offset: Point = {x: 0, y: 0};
  private activePointers = new Map<number, Point>();
  private dragNodeId = "";
  private panning = false;
  private lastPointer: Point | null = null;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private pinchWorldPoint: Point | null = null;
  private hoveredNodeId = "";
  private hoveredEdgeKey = "";
  private lockedTargetKey = "";
  private readonly popoverId = `chat-memory-map-popover-${Math.random().toString(36).slice(2)}`;

  constructor() {
    super();
  }

  private get viewport() {
    return {
      scale: this.scale,
      offset: this.offset,
    };
  }

  @AfterInit()
  afterViewInit() {
    this.canvas = this.querySelector<HTMLCanvasElement>("#chat-memory-map-canvas");
    this.context = this.canvas?.getContext("2d") ?? null;
    this.anchor = this.querySelector<HTMLElement>("[data-memory-map-anchor]");
    this.popup = this.querySelector<HTMLElement>(`#${this.popoverId}`);

    if (!this.canvas || !this.context || !this.anchor || !this.popup) {
      return;
    }

    this.disposers = [
      listen(this.canvas, "pointerdown", this.handlePointerDown),
      listen(this.canvas, "pointermove", this.handlePointerMove),
      listen(this.canvas, "pointerup", this.handlePointerUp),
      listen(this.canvas, "pointercancel", this.handlePointerUp),
      listen(this.canvas, "pointerleave", this.handlePointerLeave),
      listen(this.canvas, "wheel", this.handleWheel, {passive: false}),
      listen(this.canvas, "click", this.handleCanvasClick),
      listen(this.canvas, "keydown", this.handleKeydown),
      listen(document, "click", this.handleDocumentClick),
    ];

    this.resizeObserver = new ResizeObserver(() => this.resetView(false));
    this.resizeObserver.observe(this.canvas);
    this.resetView(true);
  }

  disconnectedCallback() {
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
    this.resizeObserver?.disconnect();
    window.cancelAnimationFrame(this.animationFrame);
    super.disconnectedCallback();
  }

  @WindowListener({event: "themeChange"})
  handleThemeChange() {
    this.requestRender();
  }

  private requestRender() {
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = window.requestAnimationFrame(() => this.renderCanvas());
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.canvas) {
      return;
    }

    this.canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(this.canvas, event);
    this.activePointers.set(event.pointerId, point);

    const world = screenToWorld(point, this.viewport);
    const node = this.findNodeAtWorld(world);

    if (this.activePointers.size === 2) {
      const points = Array.from(this.activePointers.values());
      this.pinchStartDistance = distance(points[0], points[1]);
      this.pinchStartScale = this.scale;
      this.pinchWorldPoint = screenToWorld(midpoint(points[0], points[1]), this.viewport);
      this.dragNodeId = "";
      this.panning = false;
      return;
    }

    if (node) {
      this.dragNodeId = node.id;
      this.hoveredNodeId = node.id;
      this.panning = false;
    } else {
      this.dragNodeId = "";
      this.panning = true;
    }

    this.lastPointer = point;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.canvas) {
      return;
    }

    const point = getCanvasPoint(this.canvas, event);
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, point);
    }

    if (this.activePointers.size === 2 && this.pinchWorldPoint) {
      const points = Array.from(this.activePointers.values());
      const pointerDistance = distance(points[0], points[1]);
      const center = midpoint(points[0], points[1]);
      const nextScale = clamp(this.pinchStartScale * (pointerDistance / Math.max(1, this.pinchStartDistance)), 0.35, 2.6);
      this.scale = nextScale;
      this.offset = {
        x: center.x - this.pinchWorldPoint.x * nextScale,
        y: center.y - this.pinchWorldPoint.y * nextScale,
      };
      this.requestRender();
      return;
    }

    if (this.dragNodeId && this.lastPointer) {
      const node = this.nodes.find(candidate => candidate.id === this.dragNodeId);
      if (node) {
        const dx = (point.x - this.lastPointer.x) / this.scale;
        const dy = (point.y - this.lastPointer.y) / this.scale;
        node.x += dx;
        node.y += dy;
      }
      this.lastPointer = point;
      this.requestRender();
      return;
    }

    if (this.panning && this.lastPointer) {
      this.offset.x += point.x - this.lastPointer.x;
      this.offset.y += point.y - this.lastPointer.y;
      this.lastPointer = point;
      this.requestRender();
      return;
    }

    const world = screenToWorld(point, this.viewport);
    const hovered = this.findNodeAtWorld(world);
    const edge = hovered ? null : this.findEdgeAtWorld(world);
    this.hoveredNodeId = hovered?.id ?? "";
    this.hoveredEdgeKey = edge ? this.edgeKey(edge) : "";
    this.canvas.style.cursor = hovered ? "grab" : edge ? "pointer" : "move";

    if (!this.lockedTargetKey) {
      const target = hovered
        ? {kind: "node", node: hovered, point: worldToScreen(hovered, this.viewport)} as GraphTarget
        : edge
          ? {kind: "edge", edge, point: this.getEdgeAnchor(edge)} as GraphTarget
          : null;
      this.showTarget(target);
    }

    this.requestRender();
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    this.dragNodeId = "";
    this.panning = false;
    this.lastPointer = null;
    this.pinchWorldPoint = null;

    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private handlePointerLeave = () => {
    if (this.activePointers.size === 0) {
      this.hoveredNodeId = "";
      this.hoveredEdgeKey = "";
      if (this.canvas) {
        this.canvas.style.cursor = "move";
      }
      if (!this.lockedTargetKey) {
        this.hideMemoryMapPopover();
      }
      this.requestRender();
    }
  };

  private handleDocumentClick = (event: MouseEvent) => {
    if (this.contains(event.target as Node)) {
      return;
    }

    this.lockedTargetKey = "";
    this.hideMemoryMapPopover();
    this.requestRender();
  };

  private handleWheel = (event: WheelEvent) => {
    if (!this.canvas) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(this.canvas, event);
    const world = screenToWorld(point, this.viewport);
    const nextScale = clamp(this.scale * Math.exp(-event.deltaY * 0.001), 0.35, 2.6);

    this.scale = nextScale;
    this.offset = {
      x: point.x - world.x * nextScale,
      y: point.y - world.y * nextScale,
    };
    this.requestRender();
  };

  private handleKeydown = (event: KeyboardEvent) => {
    const panStep = event.shiftKey ? 60 : 28;
    const zoomStep = event.shiftKey ? 1.18 : 1.08;

    if (event.key === "0") {
      event.preventDefault();
      this.resetView(true);
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoomAtCenter(zoomStep);
    }
    if (event.key === "-") {
      event.preventDefault();
      this.zoomAtCenter(1 / zoomStep);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.offset.x += panStep;
      this.requestRender();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.offset.x -= panStep;
      this.requestRender();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.offset.y += panStep;
      this.requestRender();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.offset.y -= panStep;
      this.requestRender();
    }
  };

  private handleCanvasClick = (event: MouseEvent) => {
    if (!this.canvas) {
      return;
    }

    event.stopPropagation();
    const point = getCanvasPoint(this.canvas, event);
    const world = screenToWorld(point, this.viewport);
    const node = this.findNodeAtWorld(world);
    const edge = node ? null : this.findEdgeAtWorld(world);

    if (node) {
      this.lockedTargetKey = node.id;
      this.showTarget({kind: "node", node, point: worldToScreen(node, this.viewport)});
      this.requestRender();
      return;
    }

    if (edge) {
      this.lockedTargetKey = this.edgeKey(edge);
      this.showTarget({kind: "edge", edge, point: this.getEdgeAnchor(edge)});
      this.requestRender();
      return;
    }

    this.lockedTargetKey = "";
    this.hideMemoryMapPopover();
    this.requestRender();
  };

  private zoomAtCenter(multiplier: number) {
    if (!this.canvas) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const center = {x: rect.width / 2, y: rect.height / 2};
    const world = screenToWorld(center, this.viewport);
    const nextScale = clamp(this.scale * multiplier, 0.35, 2.6);
    this.scale = nextScale;
    this.offset = {
      x: center.x - world.x * nextScale,
      y: center.y - world.y * nextScale,
    };
    this.requestRender();
  }

  private resetView(resetNodes: boolean) {
    if (resetNodes) {
      this.nodes = BASE_NODES.map(node => ({...node}));
    }

    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    this.scale = rect.width < 620 ? 0.62 : 0.88;
    this.offset = {
      x: rect.width / 2 - 35,
      y: rect.height / 2,
    };
    this.requestRender();
  }

  private renderCanvas() {
    if (!this.canvas || !this.context) {
      return;
    }

    const {width, height} = resizeCanvasForDpr(this.canvas, this.context, 320, 430);
    this.draw(width, height);
  }

  private draw(width: number, height: number) {
    if (!this.context) {
      return;
    }

    const ctx = this.context;
    const basePalette = createDiagramPaletteBase();
    const dark = document.documentElement.classList.contains("dark");
    const palette: Palette = {
      ...basePalette,
      text: dark ? "#e5e7eb" : "#111827",
      labelText: dark ? "#f8fafc" : "#020617",
      labelFill: dark ? "rgba(2, 6, 23, 0.84)" : "rgba(255, 253, 248, 0.9)",
      labelStroke: dark ? "rgba(226, 232, 240, 0.18)" : "rgba(15, 23, 42, 0.12)",
      nodeFill: dark ? "#0f172a" : "#fffdf8",
      edgeFaint: dark ? "rgba(148, 163, 184, 0.22)" : "rgba(100, 116, 139, 0.22)",
      edgeStrong: dark ? "#e2e8f0" : "#0f172a",
    };

    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, palette);
    this.drawClusters(ctx, palette);
    this.drawEdges(ctx, palette);
    this.drawNodes(ctx, palette);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
    drawGridBackground(ctx, width, height, this.viewport, palette, 34);
  }

  private drawClusters(ctx: CanvasRenderingContext2D, palette: Palette) {
    const clusters = [
      {x: -430, y: 15, radiusX: 178, radiusY: 250},
      {x: -70, y: 0, radiusX: 188, radiusY: 236},
      {x: 330, y: 10, radiusX: 226, radiusY: 286},
    ];

    ctx.save();
    clusters.forEach(cluster => {
      const center = worldToScreen(cluster, this.viewport);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, cluster.radiusX * this.scale, cluster.radiusY * this.scale, -0.18, 0, Math.PI * 2);
      ctx.fillStyle = "transparent";
      ctx.strokeStyle = palette.nodeFaint;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 7]);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  private drawEdges(ctx: CanvasRenderingContext2D, palette: Palette) {
    const nodes = nodeById(this.nodes);

    EDGES.forEach(edge => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        return;
      }

      const start = worldToScreen(from, this.viewport);
      const end = worldToScreen(to, this.viewport);
      const active = this.edgeKey(edge) === this.hoveredEdgeKey || this.edgeKey(edge) === this.lockedTargetKey;
      const width = (0.35 + edge.relevance * 1.05) * Math.sqrt(this.scale);

      ctx.save();
      ctx.strokeStyle = active ? palette.edgeStrong : palette.edgeFaint;
      ctx.lineWidth = active ? width + 0.7 : width;
      ctx.lineCap = "round";
      ctx.setLineDash(edge.implicit ? [1.5, 6] : []);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      const control = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 - 34 * this.scale,
      };
      ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  private drawNodes(ctx: CanvasRenderingContext2D, palette: Palette) {
    this.nodes.forEach(node => {
      const point = worldToScreen(node, this.viewport);
      const hovered = node.id === this.hoveredNodeId || node.id === this.dragNodeId;
      const radius = node.radius * this.scale;

      ctx.save();
      ctx.shadowColor = withAlpha(palette.active, hovered ? 0.28 : 0.08);
      ctx.shadowBlur = hovered ? 16 : 8;
      ctx.fillStyle = palette.nodeFill;
      ctx.strokeStyle = hovered || node.id === this.lockedTargetKey ? palette.active : palette.node;
      ctx.lineWidth = hovered ? 1.8 : 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = palette.node;
      if (node.kind === "session") {
        ctx.fillRect(point.x - 2.5, point.y - 2.5, 5, 5);
      } else if (node.kind === "memory") {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 4);
        ctx.lineTo(point.x + 4, point.y + 3);
        ctx.lineTo(point.x - 4, point.y + 3);
        ctx.closePath();
        ctx.fill();
      }

      if (this.scale > 0.38) {
        const fontSize = Math.max(12, Math.min(15, 13 * this.scale));
        const labelY = point.y + radius + Math.max(15, 17 * this.scale);

        ctx.font = `650 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelWidth = ctx.measureText(node.label).width + 18;
        const labelHeight = fontSize + 10;

        ctx.fillStyle = palette.labelFill;
        ctx.strokeStyle = palette.labelStroke;
        ctx.lineWidth = 1;
        appendRoundedRect(ctx, point.x - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = palette.labelText;
        ctx.fillText(node.label, point.x, labelY + 0.5);
      }
      ctx.restore();
    });
  }

  private findNodeAtWorld(point: Point): GraphNode | null {
    for (let index = this.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.nodes[index];
      if (Math.hypot(node.x - point.x, node.y - point.y) <= node.radius + 8) {
        return node;
      }
    }

    return null;
  }

  private findEdgeAtWorld(point: Point): GraphEdge | null {
    const nodes = nodeById(this.nodes);
    return EDGES.find(edge => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        return false;
      }

      return distanceToSegment(point, from, to) < 13 / this.scale;
    }) ?? null;
  }

  private getEdgeAnchor(edge: GraphEdge): Point {
    const nodes = nodeById(this.nodes);
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);

    if (!from || !to) {
      return {x: 0, y: 0};
    }

    return worldToScreen({
      x: from.x * 0.45 + to.x * 0.55,
      y: from.y * 0.45 + to.y * 0.55 - 24,
    }, this.viewport);
  }

  private showTarget(target: GraphTarget | null) {
    if (!target || !this.anchor || !this.popup) {
      this.hideMemoryMapPopover();
      return;
    }

    const title = target.kind === "node" ? target.node.label : target.edge.label;
    const meta = target.kind === "node"
      ? target.node.kind
      : `${target.edge.implicit ? "implicit" : "explicit"} / ${Math.round(target.edge.relevance * 100)}% relevance`;
    const note = target.kind === "node" ? target.node.note : target.edge.note;

    this.anchor.style.left = `${target.point.x}px`;
    this.anchor.style.top = `${target.point.y}px`;
    this.popup.innerHTML = `
      <div class="max-w-[18rem] rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-xl backdrop-blur dark:border-slate-600 dark:bg-slate-950 dark:text-white">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">${meta}</p>
        <p class="mt-1.5 text-base font-semibold leading-6 text-slate-950 dark:text-white">${title}</p>
        <p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">${note}</p>
      </div>
    `;
    this.popup.style.display = "block";
  }

  private hideMemoryMapPopover() {
    if (this.popup) {
      this.popup.style.display = "none";
    }
  }

  private edgeKey(edge: GraphEdge): string {
    return `${edge.from}:${edge.to}:${edge.label}`;
  }

  render(): string {
    return HTML`
      <section
        class="not-prose relative my-8 overflow-hidden rounded-lg border border-slate-200 bg-[#fbfaf6] shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <style>
          chat-memory-map {
            display: block;
          }

          chat-memory-map canvas {
            touch-action: none;
            user-select: none;
          }

          chat-memory-map canvas:focus-visible {
            outline: 3px solid #0ea5e9;
            outline-offset: -6px;
          }

          chat-memory-map [data-memory-map-anchor] {
            position: absolute;
            inline-size: 1px;
            block-size: 1px;
            z-index: 20;
            pointer-events: none;
          }
        </style>

        <dota-popover
          data-memory-map-anchor
          placement="top"
          offset="12"
          anchored-selector="#${this.popoverId}">
        </dota-popover>

        <div id="${this.popoverId}" style="display: none; position: absolute; z-index: 40;"></div>

        <canvas
          id="chat-memory-map-canvas"
          class="block h-[31rem] w-full cursor-move sm:h-[36rem] lg:h-[40rem]"
          tabindex="0"
          role="img"
          aria-label="Interactive clustered graph of chat sessions, memory processes, and explicit or implicit memory edges. Drag nodes, drag empty space to pan, pinch or wheel to zoom."
        ></canvas>
      </section>
    `;
  }
}
