import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

@Component({
  selector: "scroll-deck",
  shadow: false,
})
export class ScrollDeckComponent extends BaseElement {
  @Property({name: "aria-label", type: String})
  ariaLabel: string = "Scroll deck";

  private dragState = {
    active: false,
    startX: 0,
    startScrollLeft: 0,
    startIndex: 0,
    deltaX: 0,
    moved: false,
  };
  private keyboardActive = false;
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
  private mouseUpHandler: (() => void) | null = null;
  private onWindowKeydown = (event: KeyboardEvent) => {
    if (!this.keyboardActive) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.stepCarousel(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.stepCarousel(1);
    }
  };

  private readonly content!: string;

  constructor() {
    super();
    this.content = this.innerHTML;
    this.style.display = "block";
    this.style.width = "100%";
    this.style.minWidth = "0";
  }

  private getScroller(): HTMLElement | null {
    return this.querySelector<HTMLElement>("[data-scroll-deck-scroller]");
  }

  private getSlides(scroller: HTMLElement): HTMLElement[] {
    return Array.from(scroller.querySelectorAll<HTMLElement>("[data-scroll-slide]"));
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

  private scrollToSlide(scroller: HTMLElement, index: number, behavior: ScrollBehavior = "smooth") {
    const slides = this.getSlides(scroller);
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    const target = slides[clamped];
    if (!target) return;

    scroller.scrollTo({
      left: target.offsetLeft,
      behavior,
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
        this.scrollToSlide(scroller, this.dragState.startIndex + direction, "auto");
      } else {
        this.scrollToSlide(scroller, activeIndex, "auto");
      }

    this.dragState.active = false;
    this.dragState.deltaX = 0;
    this.dragState.moved = false;
    scroller.classList.remove("is-dragging");
    scroller.style.scrollSnapType = "";
    scroller.style.scrollBehavior = "";
    };

    scroller.addEventListener("mousedown", (event: MouseEvent) => {
      if (event.button !== 0) return;
      this.dragState.active = true;
      this.dragState.startX = event.clientX;
      this.dragState.startScrollLeft = scroller.scrollLeft;
      this.dragState.startIndex = this.getNearestSlideIndex(scroller);
      this.dragState.deltaX = 0;
      this.dragState.moved = false;
      scroller.classList.add("is-dragging");
      scroller.style.scrollSnapType = "none";
      scroller.style.scrollBehavior = "auto";
      scroller.focus?.({preventScroll: true});
      this.keyboardActive = true;
      event.preventDefault();
    });

    this.mouseMoveHandler = (event: MouseEvent) => {
      if (!this.dragState.active) return;

      const deltaX = event.clientX - this.dragState.startX;
      this.dragState.deltaX = deltaX;
      if (!this.dragState.moved && Math.abs(deltaX) < 6) return;

      this.dragState.moved = true;
      const limit = Math.max(24, scroller.clientWidth * 0.82);
      const clampedDelta = Math.max(-limit, Math.min(limit, deltaX));
      scroller.scrollLeft = this.dragState.startScrollLeft - clampedDelta;
      event.preventDefault();
    };

    this.mouseUpHandler = () => stopDrag();

    window.addEventListener("mousemove", this.mouseMoveHandler);
    window.addEventListener("mouseup", this.mouseUpHandler);
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
    scroller.addEventListener("focusin", () => {
      this.keyboardActive = true;
    });
    scroller.addEventListener("focusout", (event: FocusEvent) => {
      const nextTarget = event.relatedTarget as Node | null;
      this.keyboardActive = !!nextTarget && this.contains(nextTarget);
    });
    scroller.addEventListener("mouseenter", () => {
      this.keyboardActive = true;
    });
    window.addEventListener("keydown", this.onWindowKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onWindowKeydown);
    if (this.mouseMoveHandler) {
      window.removeEventListener("mousemove", this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      window.removeEventListener("mouseup", this.mouseUpHandler);
    }
    super.disconnectedCallback?.();
  }

  render(): string {
    return `
      <section class="my-8 w-full">
        <div
          data-scroll-deck-scroller
          tabindex="0"
          role="region"
          aria-label="${this.ariaLabel}"
          class="cursor-grab overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth select-none custom-scrollbar active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          style="scrollbar-width: none; -ms-overflow-style: none; touch-action: pan-x; scroll-snap-stop: always;"
        >
          <div class="flex gap-4 pb-2">
            ${this.content}
          </div>
        </div>
      </section>
    `;
  }
}
