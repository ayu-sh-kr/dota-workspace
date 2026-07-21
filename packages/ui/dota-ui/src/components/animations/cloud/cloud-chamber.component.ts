import { BaseElement, Component, Property, String } from "@ayu-sh-kr/dota-core";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import { ORB_COLOR_MAP } from "@dota/components/animations/orb/orb-background.component.ts";
import type { OrbitColor } from "@dota/components/animations/orb/orb-background.component.ts";

const TAU = Math.PI * 2;
const MOTE_COUNT = 180;
const VAPOR_TEXTURE_WIDTH = 180;
const VAPOR_TEXTURE_HEIGHT = 110;
const VAPOR_FIELD_LAYER_COUNT = 5;

type RGB = [number, number, number];

interface Palette {
  core: RGB;
  mid: RGB;
  edge: RGB;
}

interface Mote {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftX: number;
  driftY: number;
}

interface VaporFieldLayer {
  frequencyX: number;
  frequencyY: number;
  diagonal: number;
  speed: number;
  phase: number;
  weight: number;
}

interface VaporField {
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  coldPlateY: number;
  coldPlateSpread: number;
  layers: VaporFieldLayer[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function resolvePalette(color: OrbitColor): Palette {
  const dark = document.documentElement.classList.contains("dark");
  const palette = ORB_COLOR_MAP[color] ?? ORB_COLOR_MAP.cyan;
  const glowStops = dark ? palette.glow.dark : palette.glow.light;

  return {
    core: glowStops[0],
    mid: glowStops[Math.min(2, glowStops.length - 1)],
    edge: glowStops[Math.min(glowStops.length - 1, dark ? 4 : 3)],
  };
}

function startLoop(
  canvas: HTMLCanvasElement,
  color: OrbitColor,
  vaporIntensity: number,
  vaporDensity: number,
  vaporGlow: number
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return () => {};
  }

  const vaporCanvas = document.createElement("canvas");
  const vaporCtx = vaporCanvas.getContext("2d");
  if (!vaporCtx) {
    return () => {};
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let frame = 0;
  let motes: Mote[] = [];
  let vaporImageData: ImageData | null = null;
  let vaporField: VaporField = {
    centerX: 0.5,
    centerY: 0.5,
    scaleX: 1.25,
    scaleY: 1.65,
    coldPlateY: 0.62,
    coldPlateSpread: 2.6,
    layers: [],
  };
  let palette = resolvePalette(color);
  const vaporStrength = clamp(vaporIntensity, 0.35, 5);
  const densityStrength = clamp(vaporDensity, 0.1, 3.2);
  const glowStrength = clamp(vaporGlow, 0, 3);

  const themeObserver = new MutationObserver(() => {
    palette = resolvePalette(color);
  });

  const seedMotes = () => {
    motes = Array.from({ length: MOTE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: randomBetween(0.25, 0.85),
      alpha: randomBetween(0.014, 0.06) * (0.75 + vaporStrength * 0.35) * densityStrength,
      driftX: randomBetween(-0.08, 0.08),
      driftY: randomBetween(-0.05, 0.05),
    }));
  };

  const seedVaporField = () => {
    vaporField = {
      centerX: randomBetween(0.44, 0.56),
      centerY: randomBetween(0.42, 0.54),
      scaleX: randomBetween(1.08, 1.46),
      scaleY: randomBetween(1.36, 1.86),
      coldPlateY: randomBetween(0.55, 0.68),
      coldPlateSpread: randomBetween(2.2, 3.2),
      layers: Array.from({ length: VAPOR_FIELD_LAYER_COUNT }, () => ({
        frequencyX: randomBetween(6.5, 16),
        frequencyY: randomBetween(7.5, 18),
        diagonal: randomBetween(9, 24),
        speed: randomBetween(-0.42, 0.42),
        phase: randomBetween(0, TAU),
        weight: randomBetween(0.08, 0.22),
      })),
    };
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vaporCanvas.width = VAPOR_TEXTURE_WIDTH;
    vaporCanvas.height = VAPOR_TEXTURE_HEIGHT;
    vaporImageData = vaporCtx.createImageData(VAPOR_TEXTURE_WIDTH, VAPOR_TEXTURE_HEIGHT);
    seedMotes();
  };

  const renderVapor = () => {
    if (glowStrength > 0) {
      const pulse = 0.9 + Math.sin(frame * 0.009 + vaporField.centerX * TAU) * 0.1;
      const glowRadius = Math.max(width, height) * (0.48 + glowStrength * 0.08) * pulse;
      const glow = ctx.createRadialGradient(
        width * vaporField.centerX,
        height * vaporField.centerY,
        0,
        width * vaporField.centerX,
        height * vaporField.centerY,
        glowRadius
      );

      glow.addColorStop(0, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${(0.12 * glowStrength).toFixed(3)})`);
      glow.addColorStop(0.36, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(0.07 * glowStrength).toFixed(3)})`);
      glow.addColorStop(0.72, `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(0.025 * glowStrength).toFixed(3)})`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.filter = `blur(${(28 + glowStrength * 18).toFixed(2)}px)`;
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (vaporImageData) {
      const data = vaporImageData.data;
      const time = frame * 0.012;
      for (let y = 0; y < VAPOR_TEXTURE_HEIGHT; y++) {
        const ny = y / (VAPOR_TEXTURE_HEIGHT - 1);
        for (let x = 0; x < VAPOR_TEXTURE_WIDTH; x++) {
          const nx = x / (VAPOR_TEXTURE_WIDTH - 1);
          const center = Math.max(
            0,
            1 - Math.hypot(
              (nx - vaporField.centerX) * vaporField.scaleX,
              (ny - vaporField.centerY) * vaporField.scaleY
            )
          );
          const coldPlate = Math.max(0, 1 - Math.abs(ny - vaporField.coldPlateY) * vaporField.coldPlateSpread);
          const field = vaporField.layers.reduce((sum, layer) => {
            const phase = layer.phase + time * layer.speed;
            return sum +
              Math.sin(nx * layer.frequencyX + phase) * layer.weight +
              Math.sin(ny * layer.frequencyY - phase * 0.73) * layer.weight * 0.82 +
              Math.sin((nx + ny) * layer.diagonal + phase * 0.43) * layer.weight * 0.58;
          }, 0);
          const density = clamp((center * 0.68 + coldPlate * 0.3 + field) * vaporStrength * densityStrength, 0, 1);
          const index = (y * VAPOR_TEXTURE_WIDTH + x) * 4;
          data[index] = Math.round(palette.edge[0] + (palette.mid[0] - palette.edge[0]) * density);
          data[index + 1] = Math.round(palette.edge[1] + (palette.mid[1] - palette.edge[1]) * density);
          data[index + 2] = Math.round(palette.edge[2] + (palette.mid[2] - palette.edge[2]) * density);
          data[index + 3] = Math.round(64 * density);
        }
      }

      vaporCtx.putImageData(vaporImageData, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.filter = "blur(18px) saturate(1.16)";
      ctx.globalAlpha = 0.92;
      ctx.drawImage(vaporCanvas, -28, -28, width + 56, height + 56);
      ctx.restore();
    }

    const chamberCore = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      0,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.58
    );
    chamberCore.addColorStop(0, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${(0.082 * vaporStrength * densityStrength).toFixed(3)})`);
    chamberCore.addColorStop(0.28, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(0.054 * vaporStrength * densityStrength).toFixed(3)})`);
    chamberCore.addColorStop(0.62, `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(0.024 * vaporStrength * densityStrength).toFixed(3)})`);
    chamberCore.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = chamberCore;
    ctx.fillRect(0, 0, width, height);

    const chamberVeil = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.06,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.92
    );
    chamberVeil.addColorStop(0, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(0.035 * vaporStrength * densityStrength).toFixed(3)})`);
    chamberVeil.addColorStop(0.52, `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(0.016 * vaporStrength * densityStrength).toFixed(3)})`);
    chamberVeil.addColorStop(1, `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(0.004 * vaporStrength * densityStrength).toFixed(3)})`);
    ctx.fillStyle = chamberVeil;
    ctx.fillRect(0, 0, width, height);

    const premiumPulse = 0.86 + Math.sin(frame * 0.006) * 0.14;
    const premiumAlpha = clamp(0.72 + glowStrength * 0.18, 0.72, 1.18);
    const blobX = width * vaporField.centerX;
    const blobY = height * (vaporField.centerY - 0.02);
    const blobRadius = Math.min(width, height) * 0.36;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.filter = "blur(24px) saturate(1.14)";
    const pearlGloss = ctx.createRadialGradient(
      blobX - blobRadius * 0.28,
      blobY - blobRadius * 0.32,
      blobRadius * 0.08,
      blobX - blobRadius * 0.12,
      blobY - blobRadius * 0.18,
      blobRadius * 0.98
    );
    pearlGloss.addColorStop(0, `rgba(255, 255, 255, ${(0.11 * premiumAlpha * premiumPulse).toFixed(3)})`);
    pearlGloss.addColorStop(0.34, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${(0.055 * premiumAlpha).toFixed(3)})`);
    pearlGloss.addColorStop(0.68, `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(0.02 * premiumAlpha).toFixed(3)})`);
    pearlGloss.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = pearlGloss;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.filter = "blur(10px)";
    for (let i = 0; i < 4; i++) {
      const phase = frame * (0.006 + i * 0.0012) + vaporField.layers[i % vaporField.layers.length].phase;
      const ribbonWidth = blobRadius * (0.46 + i * 0.1);
      const ribbonHeight = blobRadius * (0.12 + i * 0.025);
      const offsetY = Math.sin(phase * 0.74) * blobRadius * 0.18 + (i - 1.5) * blobRadius * 0.14;
      const offsetX = Math.cos(phase * 0.58) * blobRadius * 0.08;
      const ribbonAlpha = (0.018 + i * 0.005) * premiumAlpha * densityStrength;

      ctx.beginPath();
      ctx.ellipse(
        blobX + offsetX,
        blobY + offsetY,
        ribbonWidth,
        ribbonHeight,
        Math.sin(phase) * 0.2,
        Math.PI * 0.05,
        Math.PI * 1.05
      );
      ctx.strokeStyle = `rgba(255, 255, 255, ${ribbonAlpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, blobRadius * (0.006 + i * 0.001));
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.filter = "blur(7px)";
    const rimAlpha = 0.08 * premiumAlpha * premiumPulse;
    const rimGradient = ctx.createLinearGradient(blobX - blobRadius, blobY - blobRadius, blobX + blobRadius, blobY + blobRadius);
    rimGradient.addColorStop(0, `rgba(255, 255, 255, ${(rimAlpha * 0.95).toFixed(3)})`);
    rimGradient.addColorStop(0.42, `rgba(${palette.core[0]}, ${palette.core[1]}, ${palette.core[2]}, ${(rimAlpha * 0.56).toFixed(3)})`);
    rimGradient.addColorStop(1, `rgba(${palette.edge[0]}, ${palette.edge[1]}, ${palette.edge[2]}, ${(rimAlpha * 0.28).toFixed(3)})`);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = Math.max(1, blobRadius * 0.018);
    ctx.beginPath();
    ctx.ellipse(blobX, blobY, blobRadius * 0.96, blobRadius * 0.58, -0.08, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.restore();

    for (const mote of motes) {
      mote.x += mote.driftX;
      mote.y += mote.driftY;

      if (mote.x < -4) mote.x = width + 4;
      if (mote.x > width + 4) mote.x = -4;
      if (mote.y < -4) mote.y = height + 4;
      if (mote.y > height + 4) mote.y = -4;

      ctx.beginPath();
      const layerPulse = 0.75 + Math.sin(frame * 0.012 + mote.x * 0.01) * 0.25;
      ctx.arc(mote.x, mote.y, mote.size * layerPulse, 0, TAU);
      ctx.fillStyle = `rgba(${palette.mid[0]}, ${palette.mid[1]}, ${palette.mid[2]}, ${(mote.alpha * layerPulse).toFixed(3)})`;
      ctx.fill();
    }
  };

  const drawFrame = () => {
    frame += 1;
    ctx.clearRect(0, 0, width, height);
    renderVapor();

    raf = requestAnimationFrame(drawFrame);
  };

  seedVaporField();
  resize();
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", resize, { passive: true });
  raf = requestAnimationFrame(drawFrame);

  return () => {
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    window.removeEventListener("resize", resize);
  };
}
/**
 * Provides a full-viewport canvas effect that combines drifting motes and vapor.
 *
 * Inputs: `color` (`color`, default `violet`) selects the palette; `vapor-intensity`,
 * `vapor-density`, and `vapor-glow` are numeric strings defaulting to `1` and are
 * clamped by the animation loop to safe visual ranges.
 * Events: connection starts the canvas loop; disconnection tears it down.
 * Lifecycle and integration: uses light DOM, is fixed and pointer-inert, observes
 * the document theme class, and marks the decorative canvas `aria-hidden`.
 */
@Component({
  selector: "cloud-chamber",
  shadow: false,
})
export class CloudChamberComponent extends BaseElement {
  @Property({ name: "color", type: String })
  color: OrbitColor = "violet";

  @Property({ name: "vapor-intensity", type: String })
  vaporIntensity: string = "1";

  @Property({ name: "vapor-density", type: String })
  vaporDensity: string = "1";

  @Property({ name: "vapor-glow", type: String })
  vaporGlow: string = "1";

  private teardown: (() => void) | null = null;

  constructor() {
    super();
  }

  @OnEvent("connected", true)
  onConnected() {
    this.setAttribute("aria-hidden", "true");
    this.className = "pointer-events-none fixed block overflow-hidden";
    this.style.position = "fixed";
    this.style.top = "0";
    this.style.right = "0";
    this.style.bottom = "0";
    this.style.left = "0";
    this.style.width = "100vw";
    this.style.height = "100vh";
    this.style.display = "block";
    this.style.overflow = "hidden";
    this.style.zIndex = "0";

    requestAnimationFrame(() => {
      const canvas = this.querySelector<HTMLCanvasElement>("#cloud-chamber-canvas");
      const vaporIntensity = Number.parseFloat(this.vaporIntensity);
      const vaporDensity = Number.parseFloat(this.vaporDensity);
      const vaporGlow = Number.parseFloat(this.vaporGlow);
      if (canvas) {
        this.teardown = startLoop(
          canvas,
          this.color,
          Number.isFinite(vaporIntensity) ? vaporIntensity : 1,
          Number.isFinite(vaporDensity) ? vaporDensity : 1,
          Number.isFinite(vaporGlow) ? vaporGlow : 1
        );
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
        id="cloud-chamber-canvas"
        class="absolute inset-0 block"
        style="width: 100vw; height: 100vh; background: transparent; filter: saturate(1.05) blur(0.1px);"
      ></canvas>
    `;
  }
}
