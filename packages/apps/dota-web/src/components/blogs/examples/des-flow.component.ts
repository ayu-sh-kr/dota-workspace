import {AfterInit, BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

type FlowStage = {
  title: string;
  summary: string;
  before: string;
  change: string;
  after: string;
  formula: string;
  note: string;
};

const DES_FLOW_STAGES: FlowStage[] = [
  {
    title: "Input block",
    summary: "Start with the 64-bit plaintext block before DES touches it.",
    before: "Plaintext block",
    change: "Initial permutation",
    after: "Permuted block",
    formula: "P(plaintext) -> L0 + R0",
    note: "DES rearranges the bits first so the round flow starts from a fixed layout.",
  },
  {
    title: "Split",
    summary: "The block is divided into two 32-bit halves.",
    before: "L0 + R0",
    change: "Split into halves",
    after: "Left and right halves",
    formula: "L0 | R0",
    note: "Only one half drives the round function, and the other half waits to be mixed back in.",
  },
  {
    title: "Round function",
    summary: "The right half is expanded and mixed with the round key.",
    before: "R0",
    change: "Expand + key mix",
    after: "F(R0, K1)",
    formula: "E(R0) XOR K1",
    note: "This is the part that introduces the round key and reshapes the data for substitution.",
  },
  {
    title: "XOR",
    summary: "The scrambled value is combined with the left half.",
    before: "L0",
    change: "XOR with round output",
    after: "R1",
    formula: "L0 XOR F(R0, K1)",
    note: "XOR is what makes the Feistel structure reversible when the keys are used in reverse order.",
  },
  {
    title: "Swap",
    summary: "The halves switch places and become the input for the next round.",
    before: "R0 + R1",
    change: "Swap halves",
    after: "L1 + R1",
    formula: "L1 = R0, R1 = L0 XOR F(R0, K1)",
    note: "One completed round becomes the starting point for the next of the 16 DES rounds.",
  },
];

const ACCENT_BY_INDEX = [
  "text-sky-700 dark:text-sky-300",
  "text-amber-700 dark:text-amber-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-violet-700 dark:text-violet-300",
  "text-rose-700 dark:text-rose-300",
];

const CARD_ACCENT_BY_INDEX = [
  "border-sky-200 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/20",
  "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20",
  "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20",
  "border-violet-200 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/20",
  "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20",
];

@Component({
  selector: "des-flow",
  shadow: false,
})
export class DesFlowComponent extends BaseElement {
  private dragState = {
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    startIndex: 0,
    deltaX: 0,
    moved: false,
  };

  private getScroller(): HTMLElement | null {
    return this.querySelector<HTMLElement>("#des-flow-scroller");
  }

  private getSlides(scroller: HTMLElement): HTMLElement[] {
    return Array.from(scroller.querySelectorAll<HTMLElement>("[data-des-slide]"));
  }

  private getNearestSlideIndex(scroller: HTMLElement): number {
    const slides = this.getSlides(scroller);
    if (!slides.length) return 0;

    const currentLeft = scroller.scrollLeft;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < slides.length; index += 1) {
      const distance = Math.abs(slides[index].offsetLeft - currentLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  private scrollToSlide(scroller: HTMLElement, index: number) {
    const slides = this.getSlides(scroller);
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    const target = slides[clamped];
    if (!target) return;

    scroller.scrollTo({
      left: target.offsetLeft,
      behavior: "smooth",
    });
  }

  private stepCarousel(direction: -1 | 1) {
    const scroller = this.getScroller();
    if (!scroller) return;
    const currentIndex = this.getNearestSlideIndex(scroller);
    this.scrollToSlide(scroller, currentIndex + direction);
  }

  @AfterInit()
  afterViewInit() {
    const scroller = this.getScroller();
    if (!scroller) return;

    const stopDrag = () => {
      if (!this.dragState.active) return;
      const activeIndex = this.getNearestSlideIndex(scroller);
      const direction = this.dragState.deltaX < 0 ? 1 : -1;
      const delta = Math.abs(this.dragState.deltaX);

      if (this.dragState.moved && delta >= 18) {
        this.scrollToSlide(scroller, this.dragState.startIndex + direction);
      } else {
        this.scrollToSlide(scroller, activeIndex);
      }

      this.dragState.active = false;
      this.dragState.pointerId = -1;
      this.dragState.deltaX = 0;
      this.dragState.moved = false;
      scroller.classList.remove("is-dragging");
    };

    scroller.addEventListener("pointerdown", (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;

      this.dragState.active = true;
      this.dragState.pointerId = event.pointerId;
      this.dragState.startX = event.clientX;
      this.dragState.startScrollLeft = scroller.scrollLeft;
      this.dragState.startIndex = this.getNearestSlideIndex(scroller);
      this.dragState.deltaX = 0;
      this.dragState.moved = false;
      scroller.classList.add("is-dragging");
      scroller.setPointerCapture(event.pointerId);
      scroller.focus?.({preventScroll: true});
    });

    scroller.addEventListener("pointermove", (event: PointerEvent) => {
      if (!this.dragState.active || event.pointerId !== this.dragState.pointerId) return;

      const deltaX = event.clientX - this.dragState.startX;
      this.dragState.deltaX = deltaX;
      if (!this.dragState.moved && Math.abs(deltaX) < 6) return;

      this.dragState.moved = true;
      const limit = Math.max(24, scroller.clientWidth * 0.82);
      const clampedDelta = Math.max(-limit, Math.min(limit, deltaX));
      scroller.scrollLeft = this.dragState.startScrollLeft - clampedDelta;
      event.preventDefault();
    });

    scroller.addEventListener("pointerup", stopDrag);
    scroller.addEventListener("pointercancel", stopDrag);
    scroller.addEventListener("lostpointercapture", stopDrag);
    scroller.addEventListener("mouseleave", stopDrag);
    scroller.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.stepCarousel(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        this.stepCarousel(1);
      }
    });
  }

  render(): string {
    const total = DES_FLOW_STAGES.length;

    return HTML`
      <section class="my-8 w-full">
        <div
          id="des-flow-scroller"
          tabindex="0"
          role="region"
          aria-label="DES flow carousel"
          class="cursor-grab overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth select-none custom-scrollbar active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          style="scrollbar-width: none; -ms-overflow-style: none; touch-action: auto; scroll-snap-stop: always;"
        >
          <div class="flex gap-4 pb-2">
            ${DES_FLOW_STAGES.map((stage, index) => {
              const accent = ACCENT_BY_INDEX[index % ACCENT_BY_INDEX.length];
              const cardAccent = CARD_ACCENT_BY_INDEX[index % CARD_ACCENT_BY_INDEX.length];
              const hasMore = index < total - 1;

              return `
                <article
                  data-des-slide="true"
                  class="relative min-w-full snap-start snap-always"
                  aria-label="DES flow slide ${index + 1} of ${total}"
                >
                  <div class="relative h-full min-h-[22rem] rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm
                              dark:border-slate-800 dark:bg-slate-950 sm:min-h-[24rem] sm:p-5 md:min-h-[26rem] md:p-6">
                    <div class="absolute left-4 top-4 sm:left-5 sm:top-5">
                      <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold tracking-[0.18em]
                                  text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-400
                                  ${hasMore ? "shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_24px_rgba(56,189,248,0.22)] animate-pulse" : ""}">
                        <span class="${accent}">${String(index + 1).padStart(2, "0")}</span>
                        <span class="text-slate-300 dark:text-slate-700">/</span>
                        <span>${String(total).padStart(2, "0")}</span>
                      </div>
                    </div>

                    <div class="pt-11 sm:pt-12">
                      <div class="flex flex-col gap-4">
                        <div class="max-w-2xl">
                          <p class="text-xs font-semibold uppercase tracking-[0.22em] ${accent}">
                            ${stage.title}
                          </p>
                          <h4 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.75rem]">
                            ${stage.summary}
                          </h4>
                          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                            ${stage.note}
                          </p>
                        </div>

                        <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                          <div class="min-h-[5rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Before</p>
                            <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">${stage.before}</p>
                          </div>

                          <div class="flex items-center justify-center py-1 text-slate-400 dark:text-slate-500">
                            <span class="text-xl leading-none sm:text-2xl">→</span>
                          </div>

                          <div class="min-h-[5rem] rounded-2xl border ${cardAccent} px-4 py-3">
                            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] ${accent}">After</p>
                            <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">${stage.after}</p>
                          </div>
                        </div>

                        <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Formula</p>
                          <p class="mt-1.5 font-mono text-[13px] leading-6 text-slate-800 dark:text-slate-200">${stage.formula}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </div>
      </section>
    `;
  }
}
