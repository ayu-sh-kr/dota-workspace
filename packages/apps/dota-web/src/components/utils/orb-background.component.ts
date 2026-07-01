// orb-background.component.ts
import {BaseElement, Component, Number, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";

// Circular orb geometry — must stay in sync with the CSS orb div.
//   corner mode: bottom/right = -50rem = -800px, size = 100rem → radius = 800px, centre = (cw, ch)
//   center mode: div is centred on viewport, orbit drawn at (cw/2, ch/2), radius = 300/360px
const ORB_CENTER_OFFSET  = 0;
const ORB_RADIUS_DEFAULT = 800;
const ORB_RADIUS_XL      = 960;
const ORB_RADIUS_CENTER_DEFAULT = 510;
const ORB_RADIUS_CENTER_XL      = 612;

const BASE_SPEED = 0.00024;

// ── Depth rendering ───────────────────────────────────────────────────────────
// Particles are bucketed into NUM_DEPTH_BUCKETS layers every frame and drawn
// back-to-front (painter's algorithm) to simulate a 3-D tilted ring.
//
// With centre at (cw, ch) the visible arc is t ∈ [0.5, 1.0] (upper-left quadrant).
// Depth peaks at t = 0.75 (top of circle, most visible "near" side) and tapers to
// 0.5 at the side edges (t = 0.5 / 1.0) and 0 at the bottom (t = 0.25, off-screen).
//
// Depth formula:  depth(t) = (1 + cos((t − 0.75) · 2π)) / 2
//   → 1  at t = 0.75  (top — nearest, brightest)
//   → 0.5 at t = 0.5 / 1.0 (left / right edges — medium)
//   → 0  at t = 0.25  (bottom, off-screen — far)
const NUM_DEPTH_BUCKETS = 4;
const BUCKET_ALPHA_SCALE = [0.30, 0.55, 0.78, 1.00]; // opacity per bucket (floor at 0.30 keeps back visible)
const BUCKET_SIZE_SCALE  = [0.50, 0.70, 0.88, 1.20]; // dot-radius multiplier per bucket
// ─────────────────────────────────────────────────────────────────────────────

type OrbitDirection   = 'alternate' | 'clockwise' | 'anticlockwise';
type ParticleSizeMode = 'constant'  | 'random';
type OrbitPosition    = 'corner'    | 'center';

function resolveDirection(mode: OrbitDirection, ringIndex: number): 1 | -1 {
  if (mode === 'clockwise')     return  1;
  if (mode === 'anticlockwise') return -1;
  return (ringIndex % 2 === 0 ? 1 : -1) as 1 | -1;
}

interface OrbitBand {
  expand:       number;        // signed px from the base radius: +outward / −inward
  count:        number;
  bucketColors: string[];      // precomputed fillStyle per depth bucket (no hot-loop strings)
  glowColor:    string;        // front-bucket shadow colour
  angles:       Float32Array;  // running position counter per particle
  speeds:       Float32Array;  // radians/frame; sign encodes direction
  baseSizes:    Float32Array;  // particle dot radius in px
  wobblePhase:  Float32Array;  // per-particle phase offset for radial breathing
}

// Per-band scratch — allocated once at startup, reused every frame (zero GC pressure).
interface BandScratch {
  posX:    Float32Array;
  posY:    Float32Array;
  bucketI: Int32Array[];  // [NUM_DEPTH_BUCKETS][count] — particle indices per bucket
  bucketN: Int32Array;    // live count per bucket this frame
}

const isDarkMode = () => document.documentElement.classList.contains('dark');

function generateBands(
  orbitCount:   number,
  particleGap:  number,
  baseRadius:   number,   // resolved at call time from viewport width
  spacing:      number,
  orbitSpeed:   number,
  direction:    OrbitDirection,
  particleSize: number,
  sizeMode:     ParticleSizeMode,
): OrbitBand[] {
  const TAU  = Math.PI * 2;
  const half = (orbitCount - 1) / 2;
  const bands: OrbitBand[] = [];
  const dark = isDarkMode();

  for (let i = 0; i < orbitCount; i++) {
    const expand = (i - half) * spacing; // px outward from the base radius

    // Kepler-inspired speed: v ∝ 1/√r — inner rings orbit faster.
    const keplerFactor = 1 / Math.sqrt(1 + i * 0.6);
    const speedBase    = BASE_SPEED * orbitSpeed * keplerFactor;
    const speedJitter  = speedBase * 0.18;

    const ringDirection = resolveDirection(direction, i);

    // Particle count = circumference / gap so every gap is exactly particleGap px.
    const ringRadius = baseRadius + expand;
    const perimeter  = TAU * ringRadius;
    const count      = Math.max(2, Math.round(perimeter / particleGap));

    // Colour: light mode uses deep saturated purple (visible on white);
    //         dark mode uses soft lavender (visible on dark).
    const t = i / Math.max(orbitCount - 1, 1);
    let cr: number, cg: number, cb: number, baseAlpha: number;
    if (dark) {
      cr = 192; cg = Math.round(132 + t * 10); cb = Math.round(252 - t * 30);
      baseAlpha = 0.75 - t * 0.28;
    } else {
      cr = Math.round(109 - t * 18); cg = Math.round(40 - t * 8); cb = Math.round(217 - t * 20);
      baseAlpha = 0.88 - t * 0.20;
    }

    const bucketColors = BUCKET_ALPHA_SCALE.map(
      s => `rgba(${cr},${cg},${cb},${(baseAlpha * s).toFixed(3)})`
    );
    const glowColor = `rgba(${cr},${cg},${cb},${dark ? 0.7 : 0.9})`;

    const angles      = new Float32Array(count);
    const speeds      = new Float32Array(count);
    const baseSizes   = new Float32Array(count);
    const wobblePhase = new Float32Array(count);

    for (let j = 0; j < count; j++) {
      angles[j]    = (j / count) * TAU;
      speeds[j]    = (speedBase + Math.random() * speedJitter) * ringDirection;
      baseSizes[j] = sizeMode === 'constant'
        ? particleSize
        : particleSize * (0.25 + Math.random() * 0.75); // 25–100 % of given size
      wobblePhase[j] = (j / count) * Math.PI * 7.3;    // spread so pulses don't sync
    }

    bands.push({ expand, count, bucketColors, glowColor, angles, speeds, baseSizes, wobblePhase });
  }

  return bands;
}

function startParticleLoop(
  canvas:        HTMLCanvasElement,
  orbitCount:    number,
  particleGap:   number,
  spacing:       number,
  orbitSpeed:    number,
  direction:     OrbitDirection,
  particleSize:  number,
  sizeMode:      ParticleSizeMode,
  orbitPosition: OrbitPosition,
): () => void {
  const ctx = canvas.getContext('2d')!;
  const TAU = Math.PI * 2;

  let raf = 0;
  let cw  = 0;
  let ch  = 0;

  let bands:   OrbitBand[]   = [];
  let scratch: BandScratch[] = [];

  const resolveRadius = () => orbitPosition === 'center'
    ? (cw >= 1280 ? ORB_RADIUS_CENTER_XL : ORB_RADIUS_CENTER_DEFAULT)
    : (cw >= 1280 ? ORB_RADIUS_XL        : ORB_RADIUS_DEFAULT);

  const build = () => {
    bands = generateBands(orbitCount, particleGap, resolveRadius(), spacing, orbitSpeed, direction, particleSize, sizeMode);
    scratch = bands.map(b => ({
      posX:    new Float32Array(b.count),
      posY:    new Float32Array(b.count),
      bucketI: Array.from({ length: NUM_DEPTH_BUCKETS }, () => new Int32Array(b.count)),
      bucketN: new Int32Array(NUM_DEPTH_BUCKETS),
    }));
  };

  const resize = () => {
    if (orbitPosition === 'center') {
      const container = canvas.parentElement!;
      cw = canvas.width  = container.offsetWidth;
      ch = canvas.height = container.offsetHeight;
    } else {
      cw = canvas.width  = window.innerWidth;
      ch = canvas.height = window.innerHeight;
    }
    build();
  };
  resize();
  window.addEventListener('resize', resize);

  // Rebuild band colours when the user switches light/dark mode.
  const themeObserver = new MutationObserver(build);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const loop = () => {
    ctx.clearRect(0, 0, cw, ch);

    const cx = orbitPosition === 'center' ? cw / 2 : cw + ORB_CENTER_OFFSET;
    const cy = orbitPosition === 'center' ? ch / 2 : ch + ORB_CENTER_OFFSET;
    const baseRadius = resolveRadius();

    for (let bi = 0; bi < bands.length; bi++) {
      const band = bands[bi];
      const s    = scratch[bi];

      s.bucketN.fill(0); // reset bucket counters (no allocation)

      // ── Pass 1: advance angles, compute positions, sort into depth buckets ──
      for (let i = 0; i < band.count; i++) {
        band.angles[i] += band.speeds[i];

        const t = ((band.angles[i] % TAU) + TAU) % TAU / TAU;

        // depth(t) = (1 + cos((t − 0.75)·2π)) / 2
        // → 1 at t=0.75 (top, near/bright), 0 at t=0.25 (bottom, off-screen/dim).
        const depth  = (1 + Math.cos((t - 0.75) * TAU)) / 2;
        const bucket = Math.min(NUM_DEPTH_BUCKETS - 1, Math.floor(depth * NUM_DEPTH_BUCKETS));

        // Radial wobble: purely time-driven with unique per-particle phase so each
        // particle breathes independently. Spatial multipliers are kept near-zero
        // (<<1 cycle/orbit) to avoid standing-wave deformation visible on full-circle orbits.
        const wobble = (
          Math.sin(band.wobblePhase[i] + band.angles[i] * 0.03) * 1.8 +
          Math.sin(band.wobblePhase[i] * 1.7 + band.angles[i] * 0.019) * 1.0
        );
        const r = baseRadius + band.expand + wobble;

        s.posX[i] = cx + Math.cos(t * TAU) * r;
        s.posY[i] = cy + Math.sin(t * TAU) * r;
        s.bucketI[bucket][s.bucketN[bucket]++] = i;
      }

      // ── Pass 2: draw back-to-front ────────────────────────────────────────
      // GPU state changes = NUM_DEPTH_BUCKETS per ring, not per particle.
      for (let b = 0; b < NUM_DEPTH_BUCKETS; b++) {
        const n = s.bucketN[b];
        if (n === 0) continue;

        const isFront = b === NUM_DEPTH_BUCKETS - 1;

        if (isFront) {
          // Radial glow only on the nearest layer — one ctx.fill() amortises cost.
          ctx.shadowColor = band.glowColor;
          ctx.shadowBlur  = 14;
        }

        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const i = s.bucketI[b][k];
          const x = s.posX[i];
          const y = s.posY[i];
          // Twinkle: slow per-particle size oscillation so individual dots pulse.
          const twinkle = 0.88 + 0.12 * Math.abs(Math.sin(band.wobblePhase[i] * 2.3 + band.angles[i] * 0.3));
          const sz = band.baseSizes[i] * BUCKET_SIZE_SCALE[b] * twinkle;
          ctx.moveTo(x + sz, y);
          ctx.arc(x, y, sz, 0, TAU);
        }

        ctx.fillStyle = band.bucketColors[b];
        ctx.fill();

        if (isFront) ctx.shadowBlur = 0; // reset so next ring is unaffected
      }
    }

    raf = requestAnimationFrame(loop);
  };

  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    themeObserver.disconnect();
  };
}

/**
 * Full-viewport circular decorative orb with depth-layered orbiting particle rings.
 *
 * Usage:
 *   <orb-background></orb-background>
 *   <orb-background orbit-count="5" orbit-particle-gap="18" orbit-spacing="10"
 *                   orbit-speed="1.5" orbit-direction="clockwise"
 *                   orbit-particle-size="2" orbit-size-mode="random"></orb-background>
 *
 * Attributes:
 *   orbit-count         — number of concentric rings                           (default 4)
 *   orbit-particle-gap  — arc-length distance in px between adjacent particles (default 22)
 *   orbit-spacing       — px gap between adjacent rings                        (default 14)
 *   orbit-speed         — speed multiplier; inner rings scale with Kepler      (default 1.0)
 *   orbit-direction     — alternate | clockwise | anticlockwise                (default alternate)
 *   orbit-particle-size — base dot radius in px                                (default 1.5)
 *   orbit-size-mode     — constant | random (25–100 % of size)                 (default random)
 */
@Component({
  selector: 'orb-background',
  shadow: false,
})
export class OrbBackgroundComponent extends BaseElement {

  @Property({ name: 'orbit-count',         type: Number }) orbitCount:        number          = 4;
  @Property({ name: 'orbit-particle-gap',  type: Number }) orbitParticleGap:  number          = 22;
  @Property({ name: 'orbit-spacing',       type: Number }) orbitSpacing:      number          = 14;
  @Property({ name: 'orbit-speed',         type: Number }) orbitSpeed:        number          = 1.0;
  @Property({ name: 'orbit-direction',     type: String }) orbitDirection:    OrbitDirection  = 'alternate';
  @Property({ name: 'orbit-particle-size', type: Number }) orbitParticleSize: number          = 1.5;
  @Property({ name: 'orbit-size-mode',     type: String }) orbitSizeMode:     ParticleSizeMode = 'random';
  @Property({ name: 'orbit-position',      type: String }) orbitPosition:     OrbitPosition   = 'corner';

  private teardown: (() => void) | null = null;

  constructor() {
    super();
  }

  @OnEvent("connected")
  connectedCallback() {
    // @ts-ignore
    super.connectedCallback?.();
    requestAnimationFrame(() => {
      const canvas = this.querySelector<HTMLCanvasElement>('#orb-particles');
      if (canvas) {
        this.teardown = startParticleLoop(
          canvas,
          this.orbitCount,
          this.orbitParticleGap,
          this.orbitSpacing,
          this.orbitSpeed,
          this.orbitDirection,
          this.orbitParticleSize,
          this.orbitSizeMode,
          this.orbitPosition,
        );
      }
    });
  }

  @OnEvent("disconnected")
  disconnectedCallback() {
    // @ts-ignore
    super.disconnectedCallback?.();
    this.teardown?.();
    this.teardown = null;
  }

  render(): string {
    const isCenter  = this.orbitPosition === 'center';
    const outerCls  = isCenter
      ? 'pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block'
      : 'pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block';
    const glowDiv   = isCenter
      ? `<div class="absolute rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[80rem] w-[80rem]
                     bg-[radial-gradient(circle,rgba(147,51,234,0.48)_0%,rgba(109,40,217,0.32)_22%,rgba(88,28,195,0.18)_44%,rgba(67,20,170,0.08)_66%,rgba(46,12,145,0.03)_88%,rgba(30,8,120,0)_100%)]
                     dark:bg-[radial-gradient(circle,rgba(205,155,255,0.85)_0%,rgba(165,92,245,0.66)_20%,rgba(128,54,228,0.46)_42%,rgba(100,34,208,0.28)_62%,rgba(74,18,182,0.14)_82%,rgba(52,10,155,0.04)_100%)]
                     blur-[130px] saturate-[130%] dark:saturate-[115%]
                     xl:h-[96rem] xl:w-[96rem]"></div>`
      : `<div class="absolute rounded-full bottom-[-50rem] right-[-50rem] h-[100rem] w-[100rem]
                     bg-[radial-gradient(circle,rgba(147,51,234,0.48)_0%,rgba(109,40,217,0.32)_22%,rgba(88,28,195,0.18)_44%,rgba(67,20,170,0.08)_66%,rgba(46,12,145,0.03)_88%,rgba(30,8,120,0)_100%)]
                     dark:bg-[radial-gradient(circle,rgba(205,155,255,0.85)_0%,rgba(165,92,245,0.66)_20%,rgba(128,54,228,0.46)_42%,rgba(100,34,208,0.28)_62%,rgba(74,18,182,0.14)_82%,rgba(52,10,155,0.04)_100%)]
                     blur-[130px] saturate-[130%] dark:saturate-[115%]
                     xl:bottom-[-60rem] xl:right-[-60rem] xl:h-[120rem] xl:w-[120rem]"></div>`;
    return `
      <div class="${outerCls}">
        ${glowDiv}
        <canvas id="orb-particles" class="absolute inset-0 pointer-events-none"></canvas>
      </div>
    `;
  }
}
