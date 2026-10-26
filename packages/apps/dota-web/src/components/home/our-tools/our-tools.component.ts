import {AfterInit, BaseElement, Component, HostListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {DOTA_TOOLS, type DotaTool} from "@dota/components/home/utils/tools.config.ts";

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

/** Two-digit position label, e.g. `03`. */
const step = (index: number): string => String(index + 1).padStart(2, "0");

/**
 * The package index on the home page. One stage pins while the reader scrolls through it;
 * each stretch of scroll selects the next package, and the index, counter, progress line, and
 * detail panel follow. Selecting an entry in the index scrolls to that package's stretch.
 *
 * Every package's detail is rendered up front and only the active one is shown, so the server
 * and the browser produce the same markup and scrolling never re-renders the component.
 *
 * Selector: `our-tools`.
 */
@Component({selector: "our-tools", shadow: false})
export class OurToolsComponent extends BaseElement {
  private animationFrame?: number;
  private activeIndex = 0;
  private readonly reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    super();
  }

  private get orderedTools(): DotaTool[] {
    return PACKAGE_ORDER
      .map((id) => DOTA_TOOLS.find((tool) => tool.id === id))
      .filter((tool): tool is DotaTool => Boolean(tool));
  }

  private indexEntry(tool: DotaTool, index: number): TemplateResult {
    return html`
      <li>
        <button type="button" class="tools-index-entry" data-tool-index="${index}"
                aria-current="${index === 0 ? "step" : "false"}">
          <span class="tools-index-step">${step(index)}</span>
          <span class="tools-index-name"><span>dota-</span>${tool.name.replace(/^dota-/, "")}</span>
        </button>
      </li>
    `;
  }

  private detail(tool: DotaTool, index: number): TemplateResult {
    return html`
      <article class="tools-detail" data-tool-detail="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
        <p class="type-eyebrow">${tool.role}</p>
        <h3 class="type-section text-foreground"><span class="text-muted">dota-</span>${tool.name.replace(/^dota-/, "")}</h3>
        <p class="type-lede text-foreground">${tool.tagline}</p>
        <p class="type-body text-muted">${tool.description}</p>
        <ul class="flex flex-wrap gap-2" role="list" aria-label="${tool.name} highlights">
          ${tool.tags.map((tag) => html`<li class="chip">${tag}</li>`)}
        </ul>
      </article>
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

  private requestUpdate = () => {
    if (this.animationFrame) return;
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.updateProgress();
    });
  };

  /** Scroll distance the pinned stage travels, and how far into it the reader is. */
  private scrollState(): {track: HTMLElement; start: number; length: number} | undefined {
    const track = this.querySelector<HTMLElement>("[data-tools-track]");
    if (!track) return undefined;
    const start = track.getBoundingClientRect().top + window.scrollY;
    return {track, start, length: Math.max(track.offsetHeight - window.innerHeight, 1)};
  }

  private updateProgress() {
    const state = this.scrollState();
    if (!state) return;
    const count = this.orderedTools.length;
    const progress = Math.min(1, Math.max(0, (window.scrollY - state.start) / state.length));
    const index = Math.min(count - 1, Math.floor(progress * count));

    state.track.style.setProperty("--tools-progress", progress.toFixed(4));
    state.track.style.setProperty("--tools-active", String(index));
    if (index === this.activeIndex) return;
    this.activeIndex = index;

    this.querySelectorAll<HTMLElement>("[data-tool-index]").forEach((entry) => {
      entry.setAttribute("aria-current", Number(entry.dataset.toolIndex) === index ? "step" : "false");
    });
    this.querySelectorAll<HTMLElement>("[data-tool-detail]").forEach((detail) => {
      detail.setAttribute("aria-hidden", Number(detail.dataset.toolDetail) === index ? "false" : "true");
    });
    const counter = this.querySelector("[data-tools-counter]");
    if (counter) counter.textContent = step(index);
  }

  /** Scrolls to the middle of a package's stretch so it becomes the active one. */
  private jumpTo(index: number) {
    const state = this.scrollState();
    if (!state) return;
    const count = this.orderedTools.length;
    const target = state.start + state.length * ((index + .5) / count);
    window.scrollTo({top: target, behavior: this.reducedMotionQuery.matches ? "auto" : "smooth"});
  }

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    const entry = (event.target as HTMLElement).closest<HTMLElement>("[data-tool-index]");
    if (entry) this.jumpTo(Number(entry.dataset.toolIndex));
  }

  render(): TemplateResult {
    const tools = this.orderedTools;
    return html`
      <section class="tools-section home-section-divider" aria-labelledby="tools-title">
        <div class="tools-track" data-tools-track style="--tools-count:${tools.length};--tools-active:0;--tools-progress:0">
          <div class="tools-stage layout-page">
            <header class="tools-head">
              <div class="flex flex-col gap-3">
                <span class="type-eyebrow">Ecosystem</span>
                <h2 id="tools-title" class="type-section text-foreground">Eight packages, one framework.</h2>
              </div>
              <p class="tools-counter" aria-hidden="true">
                <span data-tools-counter>${step(0)}</span><span class="text-muted"> / ${step(tools.length - 1)}</span>
              </p>
            </header>

            <div class="tools-progress" aria-hidden="true"><i></i></div>

            <div class="tools-body">
              <nav class="tools-index" aria-label="Dota packages">
                <span class="tools-index-marker" aria-hidden="true"></span>
                <ol role="list">${tools.map((tool, index) => this.indexEntry(tool, index))}</ol>
              </nav>
              <div class="tools-details">
                ${tools.map((tool, index) => this.detail(tool, index))}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
