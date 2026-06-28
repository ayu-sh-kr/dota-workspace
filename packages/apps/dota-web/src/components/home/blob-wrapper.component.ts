import {BaseElement, Component, HTML, Property, String, Number} from "@ayu-sh-kr/dota-wrap/core";
import {BLOB_A, BLOB_B, BLOB_C, BLOB_D} from "@ayu-sh-kr/dota-ui";

const BLOBS = [BLOB_A, BLOB_B, BLOB_C, BLOB_D];

@Component({
  selector: 'blob-wrapper',
  shadow: false
})
export class BlobWrapperComponent extends BaseElement {

  @Property({name: 'side', type: String})
  side: string = 'left';

  @Property({name: 'index', type: Number})
  index: number = 0;

  private content: string = '';

  constructor() {
    super();
    this.content = this.innerHTML;
  }

  render(): string {
    const blob = BLOBS[this.index % BLOBS.length];
    const posClass = this.side === 'left'
      ? '-left-24 top-1/2 -translate-y-1/2'
      : '-right-24 top-1/2 -translate-y-1/2';

    return HTML`
      <div class="relative overflow-visible" style="isolation: isolate;">
        <div class="blob-inner absolute ${posClass} w-[min(800px,90vw)] h-[min(800px,90vw)] pointer-events-none select-none" style="z-index: -1;" aria-hidden="true">
          ${blob}
        </div>
        <div class="relative" style="z-index: 1;">
          ${this.content}
        </div>
      </div>
    `;
  }
}
