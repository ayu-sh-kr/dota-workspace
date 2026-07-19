import {AfterInit, BaseElement, Component, HostListener, HTML} from "@ayu-sh-kr/dota-wrap/core";
import {DOTA_TOOLS, type DotaTool} from "@dota/components/home/utils/tools.config.ts";

type PackagePresentation = {
  tint: string;
  tintEnd: string;
  x: number;
  y: number;
  mobileX: number;
  mobileY: number;
};

const PACKAGE_ORDER = [
  "dota-core",
  "dota-ui",
  "dota-router",
  "dota-rest",
  "dota-event",
  "dota-wrap",
  "dota-md",
  "dota-vite-preloader",
] as const;

const PRESENTATION: Record<string, PackagePresentation> = {
  "dota-core": {tint: "#8b7cf6", tintEnd: "#6d5ce0", x: 50, y: 48, mobileX: 50, mobileY: 48},
  "dota-ui": {tint: "#e05e9b", tintEnd: "#c04382", x: 76, y: 25, mobileX: 78, mobileY: 24},
  "dota-router": {tint: "#f2a65e", tintEnd: "#d67f3f", x: 80, y: 56, mobileX: 78, mobileY: 52},
  "dota-rest": {tint: "#5ea8f2", tintEnd: "#3f7fd6", x: 24, y: 24, mobileX: 22, mobileY: 24},
  "dota-event": {tint: "#5ed6c8", tintEnd: "#3fb0a4", x: 20, y: 57, mobileX: 22, mobileY: 53},
  "dota-wrap": {tint: "#b18cf2", tintEnd: "#8f66d9", x: 65, y: 79, mobileX: 70, mobileY: 79},
  "dota-md": {tint: "#9aa7b8", tintEnd: "#6f7d92", x: 36, y: 80, mobileX: 30, mobileY: 79},
  "dota-vite-preloader": {tint: "#f2d05e", tintEnd: "#d6ad3f", x: 88, y: 82, mobileX: 83, mobileY: 94},
};

const CONSTELLATION_EDGES: ReadonlyArray<readonly [string, string]> = [
  ["dota-core", "dota-ui"],
  ["dota-core", "dota-router"],
  ["dota-core", "dota-rest"],
  ["dota-core", "dota-event"],
  ["dota-core", "dota-wrap"],
  ["dota-core", "dota-md"],
  ["dota-router", "dota-vite-preloader"],
  ["dota-wrap", "dota-ui"],
  ["dota-event", "dota-rest"],
];

@Component({selector: "our-tools", shadow: false})
export class OurToolsComponent extends BaseElement {
  private animationFrame?: number;
  private activeChapter = 0;
  private readonly hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  private readonly reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    super();
  }

  private get orderedTools(): DotaTool[] {
    return PACKAGE_ORDER
      .map((id) => DOTA_TOOLS.find((tool) => tool.id === id))
      .filter((tool): tool is DotaTool => Boolean(tool));
  }

  private packageName(tool: DotaTool): string {
    return tool.name.replace(/^dota-/, "");
  }

  private chapter(tool: DotaTool, index: number): string {
    const presentation = PRESENTATION[tool.id];
    const facts = tool.tags.slice(0, 3);

    return HTML`
      <section class="dota-package-chapter" data-chapter data-index="${index}"
               style="--tint:${presentation.tint};--tint-end:${presentation.tintEnd}"
               aria-labelledby="dota-package-${index}">
        <div class="dota-package-pin">
          <div class="dota-package-glow dota-reveal-segment" aria-hidden="true"></div>
          <article class="dota-package-card">
            <div class="dota-package-tilt">
              <div class="dota-package-glyph dota-reveal-segment" aria-hidden="true">
                <dota-icon name="${tool.icon}" classname="text-white" size="xl"></dota-icon>
              </div>
              <p class="dota-package-eyebrow dota-reveal-segment">${tool.role}</p>
              <h3 id="dota-package-${index}" class="dota-package-name dota-reveal-segment">
                <span>dota-</span>${this.packageName(tool)}
              </h3>
              <p class="dota-package-description dota-reveal-segment">${tool.description}</p>
              <ul class="dota-package-spec" role="list" aria-label="${tool.name} highlights">
                ${facts.map((fact, factIndex) => `<li class="dota-reveal-segment" style="--fact-index:${factIndex}">${fact}</li>`).join("")}
              </ul>
            </div>
          </article>
          <svg class="dota-package-connector" viewBox="0 0 2 400" preserveAspectRatio="none" aria-hidden="true">
            <line x1="1" y1="0" x2="1" y2="400"></line>
          </svg>
        </div>
      </section>
    `;
  }

  private constellationLines(): string {
    return CONSTELLATION_EDGES.map(([fromId, toId]) => {
      const from = PRESENTATION[fromId];
      const to = PRESENTATION[toId];
      const length = Math.hypot(to.x - from.x, to.y - from.y).toFixed(2);
      return `<line style="--edge-length:${length}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
    }).join("");
  }

  private constellationNode(tool: DotaTool, index: number): string {
    const point = PRESENTATION[tool.id];
    return HTML`
      <div class="dota-constellation-node" data-constellation-node style="--node-delay:${(index * .035).toFixed(3)};--node-x:${point.x}%;--node-y:${point.y}%;--mobile-x:${point.mobileX}%;--mobile-y:${point.mobileY}%;--tint:${point.tint};--tint-end:${point.tintEnd}">
        <span class="dota-constellation-glyph" aria-hidden="true">
          <dota-icon name="${tool.icon}" classname="text-white" size="md"></dota-icon>
        </span>
        <span class="dota-constellation-label">${tool.name}</span>
      </div>
    `;
  }

  private finale(): string {
    const tools = this.orderedTools;
    return HTML`
      <section class="dota-constellation-finale" data-finale aria-labelledby="dota-constellation-title">
        <div class="dota-constellation-pin">
          <div class="dota-constellation-copy">
            <p>One native system</p>
            <h3 id="dota-constellation-title">Every piece, in orbit.</h3>
          </div>
          <figure class="dota-constellation-map" aria-describedby="dota-constellation-description">
            <figcaption id="dota-constellation-description" class="sr-only">
              The Dota package constellation places dota-core at the center, connected to UI, routing, HTTP, events, composition, content, and loading tools.
            </figcaption>
            <div class="dota-constellation-orbit dota-constellation-orbit-one" aria-hidden="true"></div>
            <div class="dota-constellation-orbit dota-constellation-orbit-two" aria-hidden="true"></div>
            <svg class="dota-constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              ${this.constellationLines()}
            </svg>
            ${tools.map((tool, index) => this.constellationNode(tool, index)).join("")}
          </figure>
          <p class="dota-constellation-caption">Eight focused packages. One coherent framework.</p>
        </div>
      </section>
    `;
  }

  private progressRail(): string {
    return HTML`
      <nav class="dota-package-rail" data-rail aria-label="Dota packages">
        <span class="dota-package-rail-track" aria-hidden="true"><i></i></span>
        ${this.orderedTools.map((tool, index) => HTML`
          <button type="button" data-rail-index="${index}" aria-label="Jump to ${tool.name}"
                  aria-current="${index === this.activeChapter ? "step" : "false"}"
                  style="--dot:${PRESENTATION[tool.id].tint}">
            <span></span>
          </button>
        `).join("")}
      </nav>
    `;
  }

  @AfterInit()
  afterViewInit() {
    window.addEventListener("scroll", this.requestUpdate, {passive: true});
    window.addEventListener("resize", this.requestUpdate, {passive: true});
    this.updateProgress();
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this.requestUpdate);
    window.removeEventListener("resize", this.requestUpdate);
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    super.disconnectedCallback();
  }

  private clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private requestUpdate = () => {
    if (this.animationFrame) return;
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.updateProgress();
    });
  };

  private updateProgress() {
    const chapters = Array.from(this.querySelectorAll<HTMLElement>("[data-chapter]"));
    const rail = this.querySelector<HTMLElement>("[data-rail]");
    const hostRect = this.getBoundingClientRect();
    let activeIndex = this.activeChapter;

    chapters.forEach((chapter, index) => {
      const rect = chapter.getBoundingClientRect();
      const scrollable = Math.max(rect.height - window.innerHeight, 1);
      const progress = this.clamp(-rect.top / scrollable);
      chapter.style.setProperty("--p", progress.toFixed(4));
      const active = rect.top <= 0 && rect.bottom >= window.innerHeight;
      chapter.toggleAttribute("data-active", active);
      if (active) activeIndex = index;
    });

    const finale = this.querySelector<HTMLElement>("[data-finale]");
    if (finale) {
      const rect = finale.getBoundingClientRect();
      const progress = this.clamp(-rect.top / Math.max(rect.height - window.innerHeight, 1));
      finale.style.setProperty("--p", progress.toFixed(4));
    }

    this.activeChapter = activeIndex;
    if (rail) {
      const visible = hostRect.top < window.innerHeight * .7 && hostRect.bottom > window.innerHeight * .3;
      rail.toggleAttribute("data-visible", visible);
      rail.style.setProperty("--overall", this.clamp((-hostRect.top + window.innerHeight * .35) / Math.max(hostRect.height - window.innerHeight * .3, 1)).toFixed(4));
      rail.querySelectorAll<HTMLButtonElement>("button").forEach((button, index) => {
        const active = index === activeIndex && visible;
        button.setAttribute("aria-current", active ? "step" : "false");
        button.toggleAttribute("data-active", active);
      });
    }
  }

  private jumpToChapter(index: number, focusDot = false) {
    const chapters = Array.from(this.querySelectorAll<HTMLElement>("[data-chapter]"));
    const target = chapters[Math.min(Math.max(index, 0), chapters.length - 1)];
    if (!target) return;
    target.scrollIntoView({behavior: this.reducedMotionQuery.matches ? "auto" : "smooth", block: "start"});
    if (focusDot) this.querySelector<HTMLButtonElement>(`[data-rail-index="${index}"]`)?.focus();
  }

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-rail-index]");
    if (button) this.jumpToChapter(Number(button.dataset.railIndex));
  }

  @HostListener({event: "keydown"})
  handleKeydown(event: KeyboardEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-rail-index]");
    if (!button || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    this.jumpToChapter(Number(button.dataset.railIndex) + direction, true);
  }

  @HostListener({event: "pointermove"})
  handlePointerMove(event: PointerEvent) {
    if (!this.hoverQuery.matches) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>(".dota-package-card");
    const tilt = card?.querySelector<HTMLElement>(".dota-package-tilt");
    if (!card || !tilt) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    tilt.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
    tilt.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
    tilt.style.setProperty("--mx", `${((x + .5) * 100).toFixed(1)}%`);
    tilt.style.setProperty("--my", `${((y + .5) * 100).toFixed(1)}%`);
  }

  @HostListener({event: "pointerout"})
  handlePointerOut(event: PointerEvent) {
    const card = (event.target as HTMLElement).closest<HTMLElement>(".dota-package-card");
    if (!card || (event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) return;
    const tilt = card.querySelector<HTMLElement>(".dota-package-tilt");
    tilt?.style.removeProperty("--tilt-x");
    tilt?.style.removeProperty("--tilt-y");
    tilt?.style.removeProperty("--mx");
    tilt?.style.removeProperty("--my");
  }

  render(): string {
    const tools = this.orderedTools;
    return HTML`
      <section class="dota-ecosystem-reveal" aria-labelledby="dota-ecosystem-title">
        <header class="dota-ecosystem-intro">
          <p>Ecosystem / 08 native packages</p>
          <h2 id="dota-ecosystem-title">Meet the pieces.<br><span>Then watch them connect.</span></h2>
          <div class="dota-ecosystem-scroll-cue" aria-hidden="true"><i></i><span>Scroll to explore</span></div>
        </header>
        ${this.progressRail()}
        <div class="dota-package-chapters">
          ${tools.map((tool, index) => this.chapter(tool, index)).join("")}
        </div>
        ${this.finale()}
      </section>
    `;
  }
}
