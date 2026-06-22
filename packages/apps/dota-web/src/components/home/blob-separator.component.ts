import {BaseElement, Component, HTML, Property, String, Number} from "@ayu-sh-kr/dota-core";
import {
  BLOB_A,
  BLOB_B,
  BLOB_C,
  BLOB_D,
  CIRCULAR_BLOB_A,
  CIRCULAR_BLOB_B,
  CIRCULAR_BLOB_C,
  CIRCULAR_BLOB_D
} from "@dota/components/blobs/Blobs.ts";

const BLOBS = [
  BLOB_A,
  BLOB_B,
  BLOB_C,
  BLOB_D,
  CIRCULAR_BLOB_A,
  CIRCULAR_BLOB_B,
  CIRCULAR_BLOB_C,
  CIRCULAR_BLOB_D
];

const COLOR_PLACEMENTS = [
  "text-purple-500 dark:text-purple-200",
  "text-red-400 dark:text-red-200",
  "text-rose-400 dark:text-rose-200",
  "text-orange-400 dark:text-orange-200",
  "text-amber-400 dark:text-amber-200",
  "text-yellow-400 dark:text-yellow-200",
  "text-lime-400 dark:text-lime-200",
  "text-green-400 dark:text-green-200",
  "text-emerald-400 dark:text-emerald-200",
  "text-teal-400 dark:text-teal-200",
  "text-cyan-400 dark:text-cyan-200",
  "text-sky-400 dark:text-sky-200",
  "text-blue-400 dark:text-blue-200",
  "text-indigo-400 dark:text-indigo-200",
  "text-violet-400 dark:text-violet-200",
  "text-fuchsia-400 dark:text-fuchsia-200"
];

type BlobLayer = {
  style: string;
  svg: string;
};

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const selected: T[] = [];

  while (selected.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}

function prepareBlob(blob: string): string {
  return blob
    .replace("<svg ", '<svg class="blob-separator-svg" ')
    .replace(/fill="[^"]*"/g, 'fill="currentColor"');
}

@Component({
  selector: 'blob-separator',
  shadow: false
})
export class BlobSeparatorComponent extends BaseElement {

  @Property({name: 'side', type: String})
  side: string = 'left';

  @Property({name: 'speed', type: Number})
  speed: number = 4;

  @Property({name: 'color-placement', type: Number})
  colorPlacement: number = 0;

  private layers: BlobLayer[] = [];
  private layerSignature: string = '';

  constructor() {
    super();
  }

  private resolveSpeed(): number {
    const value = globalThis.Number.isFinite(this.speed) ? this.speed : 4;
    return clamp(Math.round(value), 1, 10);
  }

  private resolveColorPlacement(): number {
    const value = globalThis.Number.isFinite(this.colorPlacement) ? this.colorPlacement : 0;
    const index = Math.round(value) % COLOR_PLACEMENTS.length;
    return index < 0 ? index + COLOR_PLACEMENTS.length : index;
  }

  private resolvePlacementClass(): string {
    return COLOR_PLACEMENTS[this.resolveColorPlacement()];
  }

  private buildLayerStyle(index: number, speed: number): string {
    const speedFactor = 1 + ((speed - 1) / 9) * 0.45;
    const rotateValue = rand(4, 9);
    const rotate = `${rotateValue.toFixed(2)}deg`;
    const rotateMid = `${(rotateValue * 0.45).toFixed(2)}deg`;
    const layerOffset = index - 1;
    const scaleStart = rand(0.92, 1.04).toFixed(3);
    const scaleEnd = (globalThis.Number(scaleStart) + rand(0.04, 0.09) * speedFactor).toFixed(3);
    const scaleMid = ((globalThis.Number(scaleStart) + globalThis.Number(scaleEnd)) / 2).toFixed(3);
    const driftX = rand(-5.5, 5.5) * speedFactor;
    const driftY = rand(-4.5, 4.5) * speedFactor;
    const driftXAlt = rand(-3.8, 3.8) * speedFactor;
    const driftYAlt = rand(-3.4, 3.4) * speedFactor;
    const durationSeconds = rand(28, 36) - (speed - 1) * 1.35 + index * 0.65;
    const duration = `${Math.max(10, durationSeconds).toFixed(2)}s`;
    return [
      `--blob-shift-x:${(layerOffset * 2.6 + rand(-1.4, 1.4)).toFixed(2)}%`,
      `--blob-shift-y:${(layerOffset * -1.8 + rand(-1.2, 1.2)).toFixed(2)}%`,
      `--blob-drift-x:${driftX.toFixed(2)}%`,
      `--blob-drift-y:${driftY.toFixed(2)}%`,
      `--blob-drift-x-mid:${(driftX * 0.72).toFixed(2)}%`,
      `--blob-drift-y-mid:${(driftY * 0.68).toFixed(2)}%`,
      `--blob-drift-x-alt:${driftXAlt.toFixed(2)}%`,
      `--blob-drift-y-alt:${driftYAlt.toFixed(2)}%`,
      `--blob-rotate-start:${index % 2 === 0 ? `-${rotate}` : rotate}`,
      `--blob-rotate-mid:${index % 2 === 0 ? rotateMid : `-${rotateMid}`}`,
      `--blob-rotate-end:${index % 2 === 0 ? rotate : `-${rotate}`}`,
      `--blob-scale-start:${scaleStart}`,
      `--blob-scale-mid:${scaleMid}`,
      `--blob-scale-end:${scaleEnd}`,
      `--blob-duration:${duration}`,
      `--blob-breathe-duration:${(globalThis.Number.parseFloat(duration) * 0.58).toFixed(2)}s`,
      `--blob-delay:${rand(-12, 0).toFixed(2)}s`,
      `--blob-opacity:${rand(0.2, 0.3).toFixed(3)}`,
      `--blob-blur:${rand(38, 58).toFixed(2)}px`
    ].filter(Boolean).join(';');
  }

  private ensureLayers(): BlobLayer[] {
    const speed = this.resolveSpeed();
    const placement = this.resolveColorPlacement();
    const signature = `${speed}:${placement}`;

    if (this.layers.length > 0 && this.layerSignature === signature) {
      return this.layers;
    }

    this.layerSignature = signature;
    this.layers = pickRandom(BLOBS, 3).map((blob, index) => ({
      style: this.buildLayerStyle(index, speed),
      svg: prepareBlob(blob)
    }));

    return this.layers;
  }

  render(): string {
    const layers = this.ensureLayers();
    const side = this.side === 'right' ? 'right' : 'left';
    const speed = this.resolveSpeed();
    const placementClass = this.resolvePlacementClass();
    const stackPositionClass = side === 'right'
      ? 'right-0 translate-x-[34%] -translate-y-1/2'
      : 'left-0 -translate-x-[34%] -translate-y-1/2';

    return HTML`
      <div
        class="relative my-[clamp(-1rem,-1.4vw,-0.375rem)] h-[clamp(2.25rem,5.5vw,4.25rem)] overflow-x-clip pointer-events-none select-none isolate ${placementClass}"
        data-color-placement="${this.resolveColorPlacement()}"
        data-speed="${speed}"
        aria-hidden="true"
      >
        <div class="absolute top-1/2 aspect-square w-[min(58rem,88vw)] ${stackPositionClass}">
          ${layers.map((layer) => `
            <div class="blob-separator-layer absolute inset-0" style="${layer.style}">
              <div class="blob-separator-glow absolute inset-0">
                ${layer.svg}
              </div>
              <div class="blob-separator-shape absolute inset-0">
                ${layer.svg}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
