import {BaseElement, Component} from "@ayu-sh-kr/dota-core";

/**
 * Wraps consumer content in a centered decorative field of softly animated blobs.
 *
 * Inputs: none; the component preserves its initial light-DOM children as content.
 * Events: none; the animation is CSS-driven and does not emit component events.
 * Lifecycle and integration: renders light DOM so the host Tailwind build can
 * provide the animation utilities and the wrapped content remains addressable.
 */
@Component({
    selector: 'blob-animation',
    shadow: false
})
class BlobsComponent extends BaseElement{

    content!: string

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {
        return `
            <div class="bg-gray-50 min-h-screen flex items-center justify-center px-16">
              <div class="relative w-full max-w-lg">
                <div class="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div class="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div class="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                <div class="relative">
                  ${this.content}
                </div>
              </div>
            </div>
        `;
    }
}

export {BlobsComponent}
