import { BaseElement, Component, Property, String } from "@ayu-sh-kr/dota-core";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import { ORB_COLOR_MAP } from "@dota/components/animations/orb/orb-background.component.ts";
import type { OrbitColor } from "@dota/components/animations/orb/orb-background.component.ts";

const TAU = Math.PI * 2;
const PULSE_LIFE = 34;
const PULSE_SPAWN_STEP = 10;
const TRACER_COUNT = 42;
const EFFECT_RADIUS = 140;

type RGB = [number, number, number];

interface Pulse {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  strength: number;
}

interface Tracer {
  angle: number;
  orbit: number;
  size: number;
  alpha: number;
  wobble: number;
  drift: number;
}

interface CursorPalette {
  core: RGB;
  mid: RGB;
  edge: RGB;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolvePalette(color: OrbitColor): CursorPalette {
  const dark = document.documentElement.classList.contains("dark");
  const palette = ORB_COLOR_MAP[color] ?? ORB_COLOR_MAP.cyan;
  const glowStops = dark ? palette.glow.dark : palette.glow.light;

  return {
    core: glowStops[0],
    mid: glowStops[Math.min(2, glowStops.length - 1)],
    edge: glowStops[Math.min(glowStops.length - 1, dark ? 4 : 3)],
  };
}

function startLoop(canvas: HTMLCanvasElement, color: OrbitColor): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return () => {};
  }

  let raf = 0;
  let frame = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let palette = resolvePalette(color);

  let mx = -1;
  let my = -1;
  let mvx = 0;
  let mvy = 0;
  let mouseActive = false;
  let pulses: Pulse[] = [];
  let tracers: Tracer[] = [];

  const themeObserver = new MutationObserver(() => {
    palette = resolvePalette(color);
  });

  const createTracers = () => {
    tracers = Array.from({ length: TRACER_COUNT }, () => ({
      angle: Math.random() * TAU,
      orbit: 16 + Math.random() * 96,
      size: 0.8 + Math.random() * 1.6,
      alpha: 0.07 + Math.random() * 0.14,
      wobble: Math.random() * 800,
      drift: 0.004 + Math.random() * 0.014,
    }));
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createTracers();
  };

  const spawnPulse = (x: number, y: number, speed: number) => {
    const safeSpeed = clamp(speed, 0.4, 16);
    const inv = 1 / safeSpeed;
    pulses.push({
      x,
      y,
      vx: mvx * inv,
      vy: mvy * inv,
      age: 0,
      life: PULSE_LIFE,
      strength: clamp(0.75 + safeSpeed * 0.07, 0.75, 1.8),
    });
  };

  const onMove = (event: MouseEvent) => {
    const px = mx < 0 ? event.clientX : mx;
    const py = my < 0 ? event.clientY : my;
    mx = event.clientX;
    my = event.clientY;
    mvx = mx - px;
    mvy = my - py;
    mouseActive = true;

    const speed = Math.hypot(mvx, mvy);
    if (speed > 0.35 && frame % PULSE_SPAWN_STEP < 2) {
      spawnPulse(mx, my, speed);
    }
  };

  const onLeave = () => {
    mouseActive = false;
  };

  resize();
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });

  const renderPulse = (pulse: Pulse) => {
    const t = pulse.age / pulse.life;
    const fade = 1 - t;
    const radius = 14 + t * 92 * pulse.strength;
    const driftX = pulse.vx * t * 22;
    const driftY = pulse.vy * t * 22;
    const px = pulse.x + driftX;
    const py = pulse.y + driftY;

    const ring = ctx.createRadialGradient(px, py, radius * 0.45, px, py, radius);
    ring.addColorStop(0, "rgba(0, 0, 0, 0)");
    ring.addColorStop(0.58, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${(fade * 0.14).toFixed(3)})`);
    ring.addColorStop(0.82, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(fade * 0.10).toFixed(3)})`);
    ring.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, TAU);
    ctx.fillStyle = ring;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, radius * 0.96, 0, TAU);
    ctx.strokeStyle = `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(fade * 0.22).toFixed(3)})`;
    ctx.lineWidth = 1 + fade * 2.2;
    ctx.stroke();
  };

  const renderCursorGlow = () => {
    if (!mouseActive || mx < 0 || my < 0) {
      return;
    }

    const speed = Math.hypot(mvx, mvy);
    const radius = 22 + Math.min(26, speed * 2.4);
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, radius);
    glow.addColorStop(0, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${Math.min(0.16, 0.08 + speed * 0.01).toFixed(3)})`);
    glow.addColorStop(0.52, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${Math.min(0.10, 0.04 + speed * 0.006).toFixed(3)})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, TAU);
    ctx.fillStyle = glow;
    ctx.fill();
  };

  const renderTracers = () => {
    if (!mouseActive || mx < 0 || my < 0) {
      return;
    }

    const speed = Math.hypot(mvx, mvy);
    const influence = clamp(speed / 10, 0.18, 1);

    for (const tracer of tracers) {
      tracer.angle += tracer.drift + speed * 0.0008;

      const wobble = Math.sin(frame * 0.035 + tracer.wobble) * 8;
      const radius = tracer.orbit + wobble + influence * 12;
      const tx = mx + Math.cos(tracer.angle) * radius + mvx * 1.6;
      const ty = my + Math.sin(tracer.angle) * radius + mvy * 1.6;

      const distance = Math.hypot(tx - mx, ty - my);
      if (distance > EFFECT_RADIUS) {
        continue;
      }

      const fade = 1 - distance / EFFECT_RADIUS;
      const alpha = tracer.alpha * fade * (0.65 + influence * 0.85);
      if (alpha < 0.02) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(tx, ty, tracer.size + fade * 1.8, 0, TAU);
      ctx.fillStyle = `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${alpha.toFixed(3)})`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(tracer.angle) * 8, ty + Math.sin(tracer.angle) * 8);
      ctx.strokeStyle = `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(alpha * 0.72).toFixed(3)})`;
      ctx.lineWidth = 0.8 + fade;
      ctx.stroke();
    }
  };

  const step = () => {
    frame++;
    ctx.clearRect(0, 0, width, height);

    pulses = pulses.filter((pulse) => pulse.age < pulse.life);
    for (const pulse of pulses) {
      renderPulse(pulse);
      pulse.age += 1;
    }

    renderTracers();
    renderCursorGlow();

    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);

  return () => {
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseleave", onLeave);
  };
}

@Component({
  selector: "cursor-displacement",
  shadow: false,
})
export class CursorDisplacementComponent extends BaseElement {
  @Property({ name: "color", type: String })
  color: OrbitColor = "cyan";

  private teardown: (() => void) | null = null;

  constructor() {
    super();
  }

  @OnEvent("connected", true)
  onConnected() {
    this.setAttribute("aria-hidden", "true");
    this.className = "pointer-events-none fixed inset-0 block overflow-hidden";
    this.style.zIndex = "0";

    requestAnimationFrame(() => {
      const canvas = this.querySelector<HTMLCanvasElement>("#cursor-displacement-canvas");
      if (canvas) {
        this.teardown = startLoop(canvas, this.color);
      }
    });
  }

  @OnEvent("disconnected", true)
  onDisconnected() {
    this.teardown?.();
    this.teardown = null;
    super.disconnectedCallback();
  }

  render(): string {
    return `
      <canvas
        id="cursor-displacement-canvas"
        class="absolute inset-0 h-full w-full"
        style="background: transparent; filter: saturate(1.08);"
      ></canvas>
    `;
  }
}
