import {AfterInit, BaseElement, BindEvent, Component, Property, String, Boolean, Number} from "@ayu-sh-kr/dota-core";
import {CarouselConfig} from "@dota/components/carousel/carousel.config.ts";
import {
  type CarouselAnimation,
  type CarouselColor,
  type CarouselGap,
  type CarouselIndicator,
  type CarouselNavigation
} from "@dota/components/carousel/CarouselTypes.ts";

@Component({
  selector: "dota-carousel",
  shadow: false
})
export class DotaCarouselComponent extends BaseElement {

  @Property({name: 'name', type: String})
  name!: string;

  @Property({name: 'indicator', type: String})
  indicator: CarouselIndicator = 'icon';

  @Property({name: 'indicator-active-icon', type: String})
  indicatorActiveIcon: string = 'mdi:circle-medium';

  @Property({name: 'indicator-regular-icon', type: String})
  indicatorRegularIcon: string = 'mdi:circle-small';

  @Property({name: 'prev-icon', type: String})
  prevIcon: string = 'mdi:arrow-left-drop-circle'

  @Property({name: 'next-icon', type: String})
  nextIcon: string = 'mdi:arrow-right-drop-circle';

  @Property({name: 'index', type: Number})
  index: number = 0;

  @Property({name: 'autoplay', type: Boolean})
  autoplay: boolean = false;

  @Property({name: 'loop', type: Boolean})
  loop: boolean = false;

  @Property({name: 'interval', type: Number})
  interval: number = 3000;

  @Property({name: 'pause-on-hover', type: Boolean})
  pauseOnHover: boolean = true;

  @Property({name: 'navigation', type: String})
  navigation: CarouselNavigation = 'auto';

  @Property({name: 'keyboard-navigation', type: Boolean})
  keyboardNavigation: boolean = true;

  @Property({name: 'slides-per-view', type: Number})
  slidesPerView: number = 1;

  @Property({name: 'gap-per-slide', type: String})
  gapPerSlide: CarouselGap = 'none';

  @Property({name: 'snap', type: Boolean})
  snap: boolean = false;

  @Property({name: 'draggable', type: Boolean})
  draggable: boolean = false;

  @Property({name: 'animation', type: String})
  animation: CarouselAnimation = 'slide';

  @Property({name: 'color', type: String})
  color: CarouselColor = 'purple';

  dotaSlides: string[] = [];

  private _autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private _isPaused: boolean = false;
  private _dragStartX: number = 0;

  constructor() {
    super();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.innerHTML;
    const slideEls = tempDiv.querySelectorAll('dota-slide');
    this.dotaSlides = Array.from(slideEls).map(el => el.innerHTML);
  }

  @AfterInit()
  afterViewInit() {
    if (this.autoplay) {
      this._startAutoplay();
    }

    if (this.pauseOnHover) {
      this.addEventListener('mouseenter', () => this.pause());
      this.addEventListener('mouseleave', () => {
        this._isPaused = false;
        if (this.autoplay) this._startAutoplay();
      });
    }

    if (this.keyboardNavigation) {
      this.setAttribute('tabindex', '0');
      this.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') this.slideNext();
        else if (e.key === 'ArrowLeft') this.slidePrev();
      });
    }

    if (this.draggable) {
      this._setupDrag();
    }
  }

  @BindEvent({event: 'click', id: '#prev-btn'})
  handlePrevClick() {
    this.slidePrev();
  }

  @BindEvent({event: 'click', id: '#next-btn'})
  handleNextClick() {
    this.slideNext();
  }

  slidePrev() {
    if (this.index > 0) {
      this.index--;
    } else if (this.loop) {
      this.index = this.dotaSlides.length - this.slidesPerView;
    }
  }

  slideNext() {
    const max = this.dotaSlides.length - this.slidesPerView;
    if (this.index < max) {
      this.index++;
    } else if (this.loop) {
      this.index = 0;
    }
  }

  pause() {
    this._isPaused = true;
    if (this._autoplayTimer) {
      clearInterval(this._autoplayTimer);
      this._autoplayTimer = null;
    }
  }

  toStart() {
    this.index = 0;
  }

  toEnd() {
    this.index = this.dotaSlides.length - this.slidesPerView;
  }

  toSlide(i: number) {
    if (i >= 0 && i < this.dotaSlides.length) {
      this.index = i;
    }
  }

  private _startAutoplay() {
    if (this._autoplayTimer) clearInterval(this._autoplayTimer);
    this._autoplayTimer = setInterval(() => {
      if (!this._isPaused) this.slideNext();
    }, this.interval);
  }

  private _setupDrag() {
    const target = (this.animation === 'slide'
      ? this.querySelector('.carousel-track')
      : this.querySelector('.carousel-stacked')) as HTMLElement;
    if (!target) return;

    target.addEventListener('mousedown', (e: MouseEvent) => {
      this._dragStartX = e.clientX;
    });
    target.addEventListener('mouseup', (e: MouseEvent) => {
      const diff = this._dragStartX - e.clientX;
      if (Math.abs(diff) > 50) diff > 0 ? this.slideNext() : this.slidePrev();
    });
    target.addEventListener('touchstart', (e: TouchEvent) => {
      this._dragStartX = e.touches[0].clientX;
    }, {passive: true});
    target.addEventListener('touchend', (e: TouchEvent) => {
      const diff = this._dragStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? this.slideNext() : this.slidePrev();
    }, {passive: true});
  }

  private _animKeyframes(): string {
    return `
      <style>
        @keyframes carousel-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes carousel-zoom-in {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes carousel-flip-in {
          from { opacity: 0; transform: perspective(600px) rotateY(-20deg); }
          to   { opacity: 1; transform: perspective(600px) rotateY(0deg); }
        }
      </style>
    `;
  }

  private _animValue(): string {
    const map: Record<Exclude<CarouselAnimation, 'slide'>, string> = {
      fade: 'carousel-fade-in 0.4s ease forwards',
      zoom: 'carousel-zoom-in 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
      flip: 'carousel-flip-in 0.4s ease forwards',
    };
    return map[this.animation as Exclude<CarouselAnimation, 'slide'>] ?? '';
  }

  private _renderStacked(): string {
    const anim = this._animValue();
    const dragClass = this.draggable ? 'cursor-grab active:cursor-grabbing select-none' : '';
    return `
      <div class="carousel-stacked relative ${dragClass}">
        ${this.dotaSlides.map((content, i) => {
          const isActive = i === this.index;
          return `
            <div class="${isActive ? '' : 'hidden'}"
                 style="${isActive ? `animation: ${anim};` : ''}">
              ${content}
            </div>
          `;
        }).join('')}
        ${this._renderNavigation()}
      </div>
    `;
  }

  private _renderSlides(): string {
    // Width relative to the track: each slide must equal (1/N) of the track
    // so it displays as (1/slidesPerView) of the visible container.
    const slideWidthInTrack = 100 / this.dotaSlides.length;
    const gapClass = CarouselConfig.gap[this.gapPerSlide];
    return this.dotaSlides.map(content => `
            <div class="carousel-slide flex-shrink-0 overflow-hidden ${gapClass}" style="width: ${slideWidthInTrack}%">
                ${content}
            </div>
        `).join('');
  }

  private _renderIndicators(): string {
    if (this.indicator === 'none' || this.dotaSlides.length <= 1) return '';

    if (this.indicator === 'number') {
      return `
                <div class="flex items-center justify-center mt-3">
                    <span class="text-sm font-medium text-${this.color}-500 dark:text-${this.color}-400">
                        ${this.index + 1} / ${this.dotaSlides.length}
                    </span>
                </div>
            `;
    }

    const dots = this.dotaSlides.map((_, i) => {
      const isActive = i === this.index;
      return `
                <button onclick="this.closest('dota-carousel').toSlide(${i})"
                        class="border-0 p-0 cursor-pointer transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}"
                        aria-label="Go to slide ${i + 1}">
                    <dota-icon name="${isActive ? this.indicatorActiveIcon : this.indicatorRegularIcon}" size="md" color="${this.color}" variant="ghost"></dota-icon>
                </button>
            `;
    }).join('');

    return `<div id="indicators" class="flex items-center justify-center gap-2 mt-3">${dots}</div>`;
  }

  private _renderNavigation(): string {
    if (this.navigation === 'never' || this.dotaSlides.length <= 1) return '';

    const max = this.dotaSlides.length - this.slidesPerView;
    const canPrev = this.loop || this.index > 0;
    const canNext = this.loop || this.index < max;
    const colorClass = `text-${this.color}-600 dark:text-${this.color}-400`;
    const disabledPrev = !canPrev ? 'opacity-40 cursor-not-allowed pointer-events-none' : '';
    const disabledNext = !canNext ? 'opacity-40 cursor-not-allowed pointer-events-none' : '';

    const prevIcon = `<dota-icon name="${this.prevIcon}" size="md"></dota-icon>`;
    const nextIcon = `<dota-icon name="${this.nextIcon}" size="md"></dota-icon>`;

    return `
            <button id="prev-btn"
                    class="${CarouselConfig.navigation.base} ${CarouselConfig.navigation.prev} ${colorClass} ${disabledPrev}"
                    aria-label="Previous slide">
                ${prevIcon}
            </button>
            <button id="next-btn"
                    class="${CarouselConfig.navigation.base} ${CarouselConfig.navigation.next} ${colorClass} ${disabledNext}"
                    aria-label="Next slide">
                ${nextIcon}
            </button>
        `;
  }

  render(): string {
    if (this.dotaSlides.length === 0) return '<div></div>';

    const wrapper = (inner: string) => `
      <div class="dota-carousel w-full"
           role="region"
           aria-label="${this.name || 'carousel'}"
           aria-roledescription="carousel">
        ${inner}
        ${this._renderIndicators()}
      </div>
    `;

    if (this.animation !== 'slide') {
      return wrapper(`
        ${this._animKeyframes()}
        ${this._renderStacked()}
      `);
    }

    const N = this.dotaSlides.length;
    const totalWidth = (N / this.slidesPerView) * 100;
    const translateX = this.index * (100 / N);
    const dragClass = this.draggable ? 'cursor-grab active:cursor-grabbing select-none' : '';

    return wrapper(`
      <div class="relative overflow-hidden">
        <div class="carousel-track flex transition-transform duration-500 ease-in-out ${dragClass}"
             style="width: ${totalWidth}%; transform: translateX(-${translateX}%);">
          ${this._renderSlides()}
        </div>
        ${this._renderNavigation()}
      </div>
    `);
  }
}