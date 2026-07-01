import {BaseElement, Component, Number, Property, String} from "@ayu-sh-kr/dota-core";
import {OnEvent} from "@ayu-sh-kr/dota-event";

// Circular orb geometry — must stay in sync with the CSS orb div.
//   corner mode: bottom/right = -50rem = -800px, size = 100rem → radius = 800px, centre = (cw, ch)
//   center mode: div is centred on viewport, orbit drawn at (cw/2, ch/2), radius = 300/360px
const ORB_CENTER_OFFSET = 0;
const ORB_RADIUS_DEFAULT = 800;
const ORB_RADIUS_XL = 960;
const ORB_RADIUS_CENTER_DEFAULT = 510;
const ORB_RADIUS_CENTER_XL = 612;

const BASE_SPEED = 0.00024;

// ── Depth rendering ───────────────────────────────────────────────────────────
// Particles are bucketed into NUM_DEPTH_BUCKETS layers every frame and drawn
// back-to-front (painter's algorithm) to simulate a 3-D tilted ring.
//
// With the centre at (cw, ch), the visible arc is t ∈ [0.5, 1.0] (upper-left quadrant).
// Depth peaks at t = 0.75 (top of circle, the most visible "near" side) and tapers to
// 0.5 at the side edges (t = 0.5 / 1.0) and 0 at the bottom (t = 0.25, off-screen).
//
// Depth formula:  depth(t) = (1 + cos((t − 0.75) · 2π)) / 2
//   → 1 at t = 0.75 (top — nearest, brightest)
//   → 0.5 at t = 0.5 / 1.0 (left / right edges — medium)
//   → 0 at t = 0.25 (bottom, off-screen — far)
const NUM_DEPTH_BUCKETS = 4;
const BUCKET_ALPHA_SCALE = [0.30, 0.55, 0.78, 1.00]; // opacity per bucket (floor at 0.30 keeps back visible)
const BUCKET_SIZE_SCALE = [0.50, 0.70, 0.88, 1.20]; // dot-radius multiplier per bucket
// ─────────────────────────────────────────────────────────────────────────────

export type OrbitDirection = 'alternate' | 'clockwise' | 'anticlockwise';
export type ParticleSizeMode = 'constant' | 'random';
export type OrbitPosition = 'corner' | 'center';
export type OrbitSize = 'sm' | 'md' | 'lg' | 'xl';
export type OrbitColor =
  | 'none' | 'red' | 'yellow' | 'rose' | 'emerald' | 'green' | 'blue'
  | 'cyan' | 'teal' | 'gray' | 'purple' | 'violet' | 'pink' | 'sky'
  | 'orange' | 'slate' | 'indigo' | 'fuchsia' | 'zinc' | 'amber'
  | 'lime' | 'stone' | 'neutral';

// Tailwind size classes per orbit-size value.
export const ORB_SIZE_MAP: Record<OrbitSize, { center: string; corner: string }> = {
  sm: {
    center: 'h-[60rem] w-[60rem] xl:h-[72rem]  xl:w-[72rem]  blur-[100px]',
    corner: 'h-[80rem] w-[80rem] xl:bottom-[-48rem] xl:right-[-48rem] xl:h-[96rem]  xl:w-[96rem]  blur-[100px]',
  },
  md: {
    center: 'h-[80rem] w-[80rem] xl:h-[96rem]  xl:w-[96rem]  blur-[130px]',
    corner: 'h-[100rem] w-[100rem] xl:bottom-[-60rem] xl:right-[-60rem] xl:h-[120rem] xl:w-[120rem] blur-[130px]',
  },
  lg: {
    center: 'h-[100rem] w-[100rem] xl:h-[120rem] xl:w-[120rem] blur-[140px]',
    corner: 'h-[120rem] w-[120rem] xl:bottom-[-72rem] xl:right-[-72rem] xl:h-[144rem] xl:w-[144rem] blur-[140px]',
  },
  xl: {
    center: 'h-[120rem] w-[120rem] xl:h-[144rem] xl:w-[144rem] blur-[160px]',
    corner: 'h-[140rem] w-[140rem] xl:bottom-[-84rem] xl:right-[-84rem] xl:h-[168rem] xl:w-[168rem] blur-[160px]',
  },
};

type RGB = [number, number, number];

// Per-color particle config.
//   particle.light → RGB at ~700 Tailwind level (saturated, visible on white)
//   particle.dark  → RGB at ~300–400 Tailwind level (bright lavender/pastel, visible on dark)
//   particle.driftDark  → [ΔR, ΔG, ΔB] added per ring (t ∈ 0–1) in dark mode
//   particle.driftLight → [ΔR, ΔG, ΔB] added per ring in light mode
//   glow.light / glow.dark → 5 / 6 explicit RGB stops for the radial gradient
//   (Stops go from innermost to outermost; alphas and positions are fixed constants below.)
export const ORB_COLOR_MAP: Record<OrbitColor, {
  particle: { light: RGB; dark: RGB; driftLight: RGB; driftDark: RGB };
  glow:     { light: [RGB,RGB,RGB,RGB,RGB]; dark: [RGB,RGB,RGB,RGB,RGB,RGB] };
}> = {
  // driftDark/driftLight: amount added to each channel per unit of t (ring index fraction).
  // Negative = decrease, positive = increase. Matched to original purple behaviour and
  // extrapolated per-hue so outer rings drift toward the deeper/richer shade of that colour.
  purple:  {
    particle: { light: [109,40,217],  dark: [192,132,252], driftLight: [-18,-8,-20],  driftDark: [0,+10,-30]  },
    glow: {
      light: [[147,51,234],[109,40,217],[88,28,195],[67,20,170],[46,12,145]],
      dark:  [[205,155,255],[165,92,245],[128,54,228],[100,34,208],[74,18,182],[52,10,155]],
    },
  },
  violet:  {
    particle: { light: [109,40,217],  dark: [167,139,250], driftLight: [-16,-6,-18],  driftDark: [0,+8,-28]   },
    glow: {
      light: [[139,92,246],[109,40,217],[91,33,182],[76,29,149],[60,21,118]],
      dark:  [[221,214,254],[196,181,253],[167,139,250],[139,92,246],[109,40,217],[91,33,182]],
    },
  },
  indigo:  {
    particle: { light: [79,70,229],   dark: [129,140,248], driftLight: [-14,-10,-20], driftDark: [0,+6,-24]   },
    glow: {
      light: [[99,102,241],[79,70,229],[67,56,202],[55,48,163],[49,46,129]],
      dark:  [[199,210,254],[165,180,252],[129,140,248],[99,102,241],[79,70,229],[67,56,202]],
    },
  },
  blue:    {
    particle: { light: [29,78,216],   dark: [96,165,250],  driftLight: [-8,-14,-20],  driftDark: [0,+4,-22]   },
    glow: {
      light: [[59,130,246],[37,99,235],[29,78,216],[28,63,176],[30,58,138]],
      dark:  [[191,219,254],[147,197,253],[96,165,250],[59,130,246],[37,99,235],[29,78,216]],
    },
  },
  sky:     {
    particle: { light: [2,132,199],   dark: [56,189,248],  driftLight: [-2,-18,-22],  driftDark: [0,0,-20]    },
    glow: {
      light: [[14,165,233],[2,132,199],[3,105,161],[7,89,133],[12,74,110]],
      dark:  [[186,230,253],[125,211,252],[56,189,248],[14,165,233],[2,132,199],[3,105,161]],
    },
  },
  cyan:    {
    particle: { light: [8,145,178],   dark: [34,211,238],  driftLight: [-2,-20,-20],  driftDark: [0,-4,-18]   },
    glow: {
      light: [[6,182,212],[8,145,178],[14,116,144],[21,94,117],[22,78,99]],
      dark:  [[165,243,252],[103,232,249],[34,211,238],[6,182,212],[8,145,178],[14,116,144]],
    },
  },
  teal:    {
    particle: { light: [13,148,136],  dark: [45,212,191],  driftLight: [-2,-20,-16],  driftDark: [0,-6,-16]   },
    glow: {
      light: [[20,184,166],[13,148,136],[15,118,110],[17,94,89],[19,78,74]],
      dark:  [[153,246,228],[94,234,212],[45,212,191],[20,184,166],[13,148,136],[15,118,110]],
    },
  },
  emerald: {
    particle: { light: [5,150,105],   dark: [52,211,153],  driftLight: [-2,-20,-14],  driftDark: [0,-8,-14]   },
    glow: {
      light: [[16,185,129],[5,150,105],[4,120,87],[6,95,70],[6,78,59]],
      dark:  [[167,243,208],[110,231,183],[52,211,153],[16,185,129],[5,150,105],[4,120,87]],
    },
  },
  green:   {
    particle: { light: [21,128,61],   dark: [74,222,128],  driftLight: [-2,-18,-10],  driftDark: [0,-10,-12]  },
    glow: {
      light: [[34,197,94],[22,163,74],[21,128,61],[20,83,45],[20,83,45]],
      dark:  [[187,247,208],[134,239,172],[74,222,128],[34,197,94],[22,163,74],[21,128,61]],
    },
  },
  lime:    {
    particle: { light: [77,124,15],   dark: [163,230,53],  driftLight: [-10,-18,-4],  driftDark: [-6,-12,0]   },
    glow: {
      light: [[132,204,22],[101,163,13],[77,124,15],[63,98,18],[54,83,20]],
      dark:  [[217,249,157],[190,242,100],[163,230,53],[132,204,22],[101,163,13],[77,124,15]],
    },
  },
  yellow:  {
    particle: { light: [161,110,6],   dark: [250,204,21],  driftLight: [-18,-16,-2],  driftDark: [-10,-8,0]   },
    glow: {
      light: [[234,179,8],[202,138,4],[161,110,6],[133,77,14],[113,63,18]],
      dark:  [[254,240,138],[253,224,71],[250,204,21],[234,179,8],[202,138,4],[161,110,6]],
    },
  },
  amber:   {
    particle: { light: [180,83,9],    dark: [251,191,36],  driftLight: [-18,-14,-2],  driftDark: [-8,-6,0]    },
    glow: {
      light: [[245,158,11],[217,119,6],[180,83,9],[146,64,14],[120,53,15]],
      dark:  [[253,230,138],[252,211,77],[245,158,11],[217,119,6],[180,83,9],[146,64,14]],
    },
  },
  orange:  {
    particle: { light: [194,65,12],   dark: [251,146,60],  driftLight: [-18,-10,-2],  driftDark: [-6,-4,0]    },
    glow: {
      light: [[249,115,22],[234,88,12],[194,65,12],[154,52,18],[124,45,18]],
      dark:  [[254,215,170],[253,186,116],[251,146,60],[249,115,22],[234,88,12],[194,65,12]],
    },
  },
  red:     {
    particle: { light: [185,28,28],   dark: [248,113,113], driftLight: [-20,-4,-4],   driftDark: [-8,0,0]     },
    glow: {
      light: [[239,68,68],[220,38,38],[185,28,28],[153,27,27],[127,29,29]],
      dark:  [[254,202,202],[252,165,165],[248,113,113],[239,68,68],[220,38,38],[185,28,28]],
    },
  },
  rose:    {
    particle: { light: [190,18,60],   dark: [251,113,133], driftLight: [-20,-4,-8],   driftDark: [-6,0,-4]    },
    glow: {
      light: [[244,63,94],[225,29,72],[190,18,60],[159,18,57],[136,19,55]],
      dark:  [[254,205,211],[253,164,175],[251,113,133],[244,63,94],[225,29,72],[190,18,60]],
    },
  },
  pink:    {
    particle: { light: [186,30,103],  dark: [244,114,182], driftLight: [-18,-4,-10],  driftDark: [-4,0,-8]    },
    glow: {
      light: [[236,72,153],[219,39,119],[186,30,103],[157,23,77],[131,24,67]],
      dark:  [[251,207,232],[249,168,212],[244,114,182],[236,72,153],[219,39,119],[186,30,103]],
    },
  },
  fuchsia: {
    particle: { light: [162,28,175],  dark: [232,121,249], driftLight: [-18,-4,-16],  driftDark: [-2,0,-20]   },
    glow: {
      light: [[217,70,239],[192,38,211],[162,28,175],[134,25,143],[112,26,117]],
      dark:  [[245,208,254],[240,171,252],[232,121,249],[217,70,239],[192,38,211],[162,28,175]],
    },
  },
  gray:    {
    particle: { light: [75,85,99],    dark: [156,163,175], driftLight: [-10,-10,-12], driftDark: [-4,-4,-4]   },
    glow: {
      light: [[107,114,128],[75,85,99],[55,65,81],[31,41,55],[17,24,39]],
      dark:  [[229,231,235],[209,213,219],[156,163,175],[107,114,128],[75,85,99],[55,65,81]],
    },
  },
  slate:   {
    particle: { light: [71,85,105],   dark: [148,163,184], driftLight: [-10,-10,-14], driftDark: [-4,-4,-6]   },
    glow: {
      light: [[100,116,139],[71,85,105],[51,65,85],[30,41,59],[15,23,42]],
      dark:  [[226,232,240],[203,213,225],[148,163,184],[100,116,139],[71,85,105],[51,65,85]],
    },
  },
  zinc:    {
    particle: { light: [82,82,91],    dark: [161,161,170], driftLight: [-10,-10,-10], driftDark: [-4,-4,-4]   },
    glow: {
      light: [[113,113,122],[82,82,91],[63,63,70],[39,39,42],[24,24,27]],
      dark:  [[228,228,231],[212,212,216],[161,161,170],[113,113,122],[82,82,91],[63,63,70]],
    },
  },
  stone:   {
    particle: { light: [87,83,78],    dark: [168,162,158], driftLight: [-10,-10,-8],  driftDark: [-4,-4,-2]   },
    glow: {
      light: [[120,113,108],[87,83,78],[68,64,60],[41,37,36],[28,25,23]],
      dark:  [[231,229,228],[214,211,209],[168,162,158],[120,113,108],[87,83,78],[68,64,60]],
    },
  },
  neutral: {
    particle: { light: [82,82,82],    dark: [163,163,163], driftLight: [-10,-10,-10], driftDark: [-4,-4,-4]   },
    glow: {
      light: [[115,115,115],[82,82,82],[64,64,64],[38,38,38],[23,23,23]],
      dark:  [[229,229,229],[212,212,212],[163,163,163],[115,115,115],[82,82,82],[64,64,64]],
    },
  },
  none:    {
    particle: { light: [75,85,99],    dark: [156,163,175], driftLight: [-10,-10,-12], driftDark: [-4,-4,-4]   },
    glow: {
      light: [[107,114,128],[75,85,99],[55,65,81],[31,41,55],[17,24,39]],
      dark:  [[229,231,235],[209,213,219],[156,163,175],[107,114,128],[75,85,99],[55,65,81]],
    },
  },
};

// Light: 5 stops at 0/22/44/66/88 % + transparent at 100 %.
// Dark:  6 stops at 0/20/42/62/82/100 %.
const GLOW_LIGHT_ALPHAS:     number[] = [0.48, 0.32, 0.18, 0.08, 0.03];
const GLOW_LIGHT_POSITIONS:  string[] = ['0%', '22%', '44%', '66%', '88%', '100%'];
const GLOW_DARK_ALPHAS:      number[] = [0.85, 0.66, 0.46, 0.28, 0.14, 0.04];
const GLOW_DARK_POSITIONS:   string[] = ['0%', '20%', '42%', '62%', '82%', '100%'];

function makeGlowGradient(stops: RGB[], dark: boolean): string {
  const alphas    = dark ? GLOW_DARK_ALPHAS    : GLOW_LIGHT_ALPHAS;
  const positions = dark ? GLOW_DARK_POSITIONS : GLOW_LIGHT_POSITIONS;
  const parts = stops.map(([r, g, b], i) => `rgba(${r},${g},${b},${alphas[i]}) ${positions[i]}`);
  if (!dark) parts.push(`rgba(0,0,0,0) ${positions[positions.length - 1]}`);
  return `radial-gradient(circle,${parts.join(',')})`;
}

function resolveDirection(mode: OrbitDirection, ringIndex: number): 1 | -1 {
  if (mode === 'clockwise') return 1;
  if (mode === 'anticlockwise') return -1;
  return (ringIndex % 2 === 0 ? 1 : -1) as 1 | -1;
}

interface OrbitBand {
  expand: number;        // signed px from the base radius: +outward / −inward
  count: number;
  bucketColors: string[];      // precomputed fillStyle per depth bucket (no hot-loop strings)
  glowColor: string;        // front-bucket shadow colour
  angles: Float32Array;  // running position counter per particle
  speeds: Float32Array;  // radians/frame; sign encodes direction
  baseSizes: Float32Array;  // particle dot radius in px
  wobblePhase: Float32Array;  // per-particle phase offset for radial breathing
}

// Per-band scratch — allocated once at startup, reused every frame (zero GC pressure).
interface BandScratch {
  posX: Float32Array;
  posY: Float32Array;
  bucketI: Int32Array[];  // [NUM_DEPTH_BUCKETS][count] — particle indices per bucket
  bucketN: Int32Array;    // live count per bucket this frame
}

const isDarkMode = () => document.documentElement.classList.contains('dark');

function generateBands(
  orbitCount: number,
  particleGap: number,
  baseRadius: number,   // resolved at call time from viewport width
  spacing: number,
  orbitSpeed: number,
  direction: OrbitDirection,
  particleSize: number,
  sizeMode: ParticleSizeMode,
  color: OrbitColor,
): OrbitBand[] {
  const TAU = Math.PI * 2;
  const half = (orbitCount - 1) / 2;
  const bands: OrbitBand[] = [];
  const dark = isDarkMode();
  const palette = ORB_COLOR_MAP[color] ?? ORB_COLOR_MAP['purple'];
  const [baseR, baseG, baseB] = dark ? palette.particle.dark : palette.particle.light;
  const [dR, dG, dB]          = dark ? palette.particle.driftDark : palette.particle.driftLight;

  for (let i = 0; i < orbitCount; i++) {
    const expand = (i - half) * spacing; // px outward from the base radius

    // Kepler-inspired speed: v ∝ 1/√r — inner rings orbit faster.
    const keplerFactor = 1 / Math.sqrt(1 + i * 0.6);
    const speedBase = BASE_SPEED * orbitSpeed * keplerFactor;
    const speedJitter = speedBase * 0.18;

    const ringDirection = resolveDirection(direction, i);

    // Particle count = circumference / gap so every gap is exactly particleGap px.
    const ringRadius = baseRadius + expand;
    const perimeter = TAU * ringRadius;
    const count = Math.max(2, Math.round(perimeter / particleGap));

    // Per-ring hue drift: shift each channel by the color-specific delta so outer
    // rings move toward a richer/deeper shade without losing the hue identity.
    const t = i / Math.max(orbitCount - 1, 1);
    const cr = Math.round(Math.min(255, Math.max(0, baseR + dR * t)));
    const cg = Math.round(Math.min(255, Math.max(0, baseG + dG * t)));
    const cb = Math.round(Math.min(255, Math.max(0, baseB + dB * t)));
    const baseAlpha = dark ? (0.75 - t * 0.28) : (0.88 - t * 0.20);

    const bucketColors = BUCKET_ALPHA_SCALE.map(
      s => `rgba(${cr},${cg},${cb},${(baseAlpha * s).toFixed(3)})`
    );
    const glowColor = `rgba(${cr},${cg},${cb},${dark ? 0.7 : 0.9})`;

    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const baseSizes = new Float32Array(count);
    const wobblePhase = new Float32Array(count);

    for (let j = 0; j < count; j++) {
      angles[j] = (j / count) * TAU;
      speeds[j] = (speedBase + Math.random() * speedJitter) * ringDirection;
      baseSizes[j] = sizeMode === 'constant'
        ? particleSize
        : particleSize * (0.25 + Math.random() * 0.75); // 25–100 % of given size
      wobblePhase[j] = (j / count) * Math.PI * 7.3;    // spread so pulses don't sync
    }

    bands.push({expand, count, bucketColors, glowColor, angles, speeds, baseSizes, wobblePhase});
  }

  return bands;
}

function startParticleLoop(
  canvas: HTMLCanvasElement,
  orbitCount: number,
  particleGap: number,
  spacing: number,
  orbitSpeed: number,
  direction: OrbitDirection,
  particleSize: number,
  sizeMode: ParticleSizeMode,
  orbitPosition: OrbitPosition,
  color: OrbitColor,
): () => void {
  const ctx = canvas.getContext('2d')!;
  const TAU = Math.PI * 2;

  let raf = 0;
  let cw = 0;
  let ch = 0;

  let bands: OrbitBand[] = [];
  let scratch: BandScratch[] = [];

  const resolveRadius = () => orbitPosition === 'center'
    ? (cw >= 1280 ? ORB_RADIUS_CENTER_XL : ORB_RADIUS_CENTER_DEFAULT)
    : (cw >= 1280 ? ORB_RADIUS_XL : ORB_RADIUS_DEFAULT);

  const build = () => {
    bands = generateBands(orbitCount, particleGap, resolveRadius(), spacing, orbitSpeed, direction, particleSize, sizeMode, color);
    scratch = bands.map(b => ({
      posX: new Float32Array(b.count),
      posY: new Float32Array(b.count),
      bucketI: Array.from({length: NUM_DEPTH_BUCKETS}, () => new Int32Array(b.count)),
      bucketN: new Int32Array(NUM_DEPTH_BUCKETS),
    }));
  };

  const resize = () => {
    if (orbitPosition === 'center') {
      const container = canvas.parentElement!;
      cw = canvas.width = container.offsetWidth;
      ch = canvas.height = container.offsetHeight;
    } else {
      cw = canvas.width = window.innerWidth;
      ch = canvas.height = window.innerHeight;
    }
    build();
  };
  resize();
  window.addEventListener('resize', resize);

  // Rebuild band colours when the user switches light/dark mode.
  const themeObserver = new MutationObserver(build);
  themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});

  const loop = () => {
    ctx.clearRect(0, 0, cw, ch);

    const cx = orbitPosition === 'center' ? cw / 2 : cw + ORB_CENTER_OFFSET;
    const cy = orbitPosition === 'center' ? ch / 2 : ch + ORB_CENTER_OFFSET;
    const baseRadius = resolveRadius();

    for (let bi = 0; bi < bands.length; bi++) {
      const band = bands[bi];
      const s = scratch[bi];

      s.bucketN.fill(0); // reset bucket counters (no allocation)

      // ── Pass 1: advance angles, compute positions, sort into depth buckets ──
      for (let i = 0; i < band.count; i++) {
        band.angles[i] += band.speeds[i];

        const t = ((band.angles[i] % TAU) + TAU) % TAU / TAU;

        // depth(t) = (1 + cos((t − 0.75)·2π)) / 2
        // → 1 at t=0.75 (top, near/bright), 0 at t=0.25 (bottom, off-screen/dim).
        const depth = (1 + Math.cos((t - 0.75) * TAU)) / 2;
        const bucket = Math.min(NUM_DEPTH_BUCKETS - 1, Math.floor(depth * NUM_DEPTH_BUCKETS));

        // Radial wobble: purely time-driven with unique per-particle phase so each
        // particle breathes independently. Spatial multipliers are kept near-zero
        // (<<1 cycle/orbit) to avoid standing-wave deformation visible on full-circle orbits.
        const wobble = (
          Math.sin(band.wobblePhase[i] + band.angles[i] * 0.03) * 1.8 +
          Math.sin(band.wobblePhase[i] * 1.7 + band.angles[i] * 0.019)
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
          ctx.shadowBlur = 14;
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
 *                   orbit-particle-size="2" orbit-size-mode="random"
 *                   orbit-size="xl"></orb-background>
 *
 * Attributes:
 *   orbit-count         — number of concentric rings                           (default 4)
 *   orbit-particle-gap  — arc-length distance in px between adjacent particles (default 22)
 *   orbit-spacing       — px gap between adjacent rings                        (default 14)
 *   orbit-speed         — speed multiplier; inner rings scale with Kepler      (default 1.0)
 *   orbit-direction     — alternate | clockwise | anticlockwise                (default alternate)
 *   orbit-particle-size — base dot radius in px                                (default 1.5)
 *   orbit-size-mode     — constant | random (25–100 % of size)                 (default random)
 *   orbit-size          — sm | md | lg | xl — controls glow div diameter       (default md)
 *   orbit-color          — OrbitColor — sets both particle and glow color      (default purple)
 *   orbit-particle-color — OrbitColor — overrides particle color only          (default: orbit-color)
 *   orbit-glow-color     — OrbitColor — overrides glow div color only          (default: orbit-color)
 */
@Component({
  selector: 'orb-background',
  shadow: false,
})
export class OrbBackgroundComponent extends BaseElement {

  @Property({name: 'orbit-count', type: Number}) orbitCount: number = 4;
  @Property({name: 'orbit-particle-gap', type: Number}) orbitParticleGap: number = 22;
  @Property({name: 'orbit-spacing', type: Number}) orbitSpacing: number = 14;
  @Property({name: 'orbit-speed', type: Number}) orbitSpeed: number = 1.0;
  @Property({name: 'orbit-direction', type: String}) orbitDirection: OrbitDirection = 'alternate';
  @Property({name: 'orbit-particle-size', type: Number}) orbitParticleSize: number = 1.5;
  @Property({name: 'orbit-size-mode', type: String}) orbitSizeMode: ParticleSizeMode = 'random';
  @Property({name: 'orbit-position', type: String}) orbitPosition: OrbitPosition = 'corner';
  @Property({name: 'orbit-size', type: String}) orbitSize: OrbitSize = 'md';
  @Property({name: 'orbit-color',          type: String}) orbitColor:         OrbitColor = 'purple';
  @Property({name: 'orbit-particle-color', type: String}) orbitParticleColor: string     = '';
  @Property({name: 'orbit-glow-color',     type: String}) orbitGlowColor:     string     = '';

  private teardown:      (() => void) | null = null;
  private glowObserver:  MutationObserver    | null = null;

  private resolveColor(specific: string): OrbitColor {
    return (specific || this.orbitColor) as OrbitColor;
  }

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
          this.resolveColor(this.orbitParticleColor),
        );
      }

      // Keep glow div gradient in sync when the user toggles dark/light mode.
      const glowEl = this.querySelector<HTMLElement>('#orb-glow');
      if (glowEl) {
        this.glowObserver = new MutationObserver(() => {
          const dark  = isDarkMode();
          const stops = (ORB_COLOR_MAP[this.resolveColor(this.orbitGlowColor)] ?? ORB_COLOR_MAP['purple']).glow;
          glowEl.style.background = makeGlowGradient(dark ? stops.dark : stops.light, dark);
        });
        this.glowObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
      }
    });
  }

  @OnEvent("disconnected")
  disconnectedCallback() {
    // @ts-ignore
    super.disconnectedCallback?.();
    this.teardown?.();
    this.teardown = null;
    this.glowObserver?.disconnect();
    this.glowObserver = null;
  }

  render(): string {
    const isCenter = this.orbitPosition === 'center';
    const outerCls = isCenter
      ? 'pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block'
      : 'pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block';
    const sizeKey    = (ORB_SIZE_MAP[this.orbitSize] ? this.orbitSize : 'md') as OrbitSize;
    const sizeCls    = isCenter ? ORB_SIZE_MAP[sizeKey].center : ORB_SIZE_MAP[sizeKey].corner;
    const glowBase   = isCenter
      ? `absolute rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
      : `absolute rounded-full bottom-[-50rem] right-[-50rem]`;
    const dark       = isDarkMode();
    const glowStops  = (ORB_COLOR_MAP[this.resolveColor(this.orbitGlowColor)] ?? ORB_COLOR_MAP['purple']).glow;
    const glowStyle  = makeGlowGradient(dark ? glowStops.dark : glowStops.light, dark);
    const glowDiv    = `<div id="orb-glow" class="${glowBase} ${sizeCls} saturate-[130%]" style="background:${glowStyle}"></div>`;
    return `
      <div class="${outerCls}">
        ${glowDiv}
        <canvas id="orb-particles" class="absolute inset-0 pointer-events-none"></canvas>
      </div>
    `;
  }
}