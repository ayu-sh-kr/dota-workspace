import {BaseElement, Component, HTML, Property, String, Number} from "@ayu-sh-kr/dota-core";
import {BLOB_A, BLOB_B, BLOB_C, BLOB_D, CIRCULAR_BLOB_A, CIRCULAR_BLOB_B} from "@dota/components/blobs/Blobs.ts";

const BLOBS = [BLOB_A, BLOB_B, BLOB_C, BLOB_D, CIRCULAR_BLOB_A, CIRCULAR_BLOB_B];

@Component({
  selector: 'blob-separator',
  shadow: false
})
export class BlobSeparatorComponent extends BaseElement {

  @Property({name: 'side', type: String})
  side: string = 'left';

  @Property({name: 'index', type: Number})
  index: number = 0;

  constructor() {
    super();
  }

  render(): string {
    const blob = BLOBS[this.index % BLOBS.length];
    const posClass = this.side === 'left'
      ? 'left-0 -translate-x-1/2 -translate-y-1/2'
      : 'right-0 translate-x-1/2 -translate-y-1/2';

    return HTML`
      <div class="overflow-x-clip relative h-0 pointer-events-none select-none" aria-hidden="true">
        <div class="blob-inner absolute ${posClass} w-[min(960px,100vw)] h-[min(960px,100vw)]">
          ${blob}
        </div>
      </div>
    `;
  }
}