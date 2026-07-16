import {AfterInit, BaseElement, Component, Property, String} from "@ayu-sh-kr/dota-core";

type EventDisposer = () => void;

/**
 * Keeps listener setup and teardown adjacent for pointer-heavy UI components.
 */
function listen(
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject | ((event: any) => void),
  options?: AddEventListenerOptions | boolean,
): EventDisposer {
  const listener = handler as EventListenerOrEventListenerObject;
  target.addEventListener(event, listener, options);
  return () => target.removeEventListener(event, listener, options);
}

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
  private scroller: HTMLElement | null = null;
  private disposers: EventDisposer[] = [];
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
    const scroller = this.scroller ?? this.getScroller();
    if (!scroller) return;
    const currentIndex = this.getNearestSlideIndex(scroller);
    this.scrollToSlide(scroller, currentIndex + direction);
  }

  private stopDrag = () => {
    const scroller = this.scroller;
    if (!scroller || !this.dragState.active) return;

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

  private handleMouseDown = (event: MouseEvent) => {
    const scroller = this.scroller;
    if (!scroller || event.button !== 0) return;

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
  };

  private handleMouseMove = (event: MouseEvent) => {
    const scroller = this.scroller;
    if (!scroller || !this.dragState.active) return;

    const deltaX = event.clientX - this.dragState.startX;
    this.dragState.deltaX = deltaX;
    if (!this.dragState.moved && Math.abs(deltaX) < 6) return;

    this.dragState.moved = true;
    const limit = Math.max(24, scroller.clientWidth * 0.82);
    const clampedDelta = Math.max(-limit, Math.min(limit, deltaX));
    scroller.scrollLeft = this.dragState.startScrollLeft - clampedDelta;
    event.preventDefault();
  };

  private handleScrollerKeydown = (event: KeyboardEvent) => {
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

  private handleFocusIn = () => {
    this.keyboardActive = true;
  };

  private handleFocusOut = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    this.keyboardActive = !!nextTarget && this.contains(nextTarget);
  };

  @AfterInit()
  afterViewInit() {
    this.scroller = this.getScroller();
    if (!this.scroller) return;

    this.disposers = [
      listen(this.scroller, "mousedown", this.handleMouseDown),
      listen(window, "mousemove", this.handleMouseMove),
      listen(window, "mouseup", this.stopDrag),
      listen(this.scroller, "mouseleave", this.stopDrag),
      listen(this.scroller, "keydown", this.handleScrollerKeydown),
      listen(this.scroller, "focusin", this.handleFocusIn),
      listen(this.scroller, "focusout", this.handleFocusOut),
      listen(this.scroller, "mouseenter", this.handleFocusIn),
      listen(window, "keydown", this.onWindowKeydown),
    ];
  }

  disconnectedCallback() {
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
    this.scroller = null;
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
