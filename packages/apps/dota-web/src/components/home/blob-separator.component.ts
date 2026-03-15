import {BaseElement, Component, HTML, Property, String, Number} from "@ayu-sh-kr/dota-core";
import {BLOB_A, BLOB_B, BLOB_C, BLOB_D} from "@dota/components/blobs/Blobs.ts";

const BLOBS = [BLOB_A, BLOB_B, BLOB_C, BLOB_D];

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
      ? 'left-[-60px] -translate-y-1/2'
      : 'right-[-60px] -translate-y-1/2';

    return HTML`
      <div class="relative h-0 overflow-visible pointer-events-none select-none" aria-hidden="true">
        <div class="blob-inner absolute ${posClass} w-[min(800px,90vw)] h-[min(800px,90vw)]">
          ${blob}
        </div>
      </div>
    `;
  }
}