import {BaseElement, Component} from "@ayu-sh-kr/dota-core";

@Component({
    selector: "dota-slide",
    shadow: false
})
export class DotaSlideComponent extends BaseElement {

    content: string = '';

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {
        return `<div class="w-full h-full">${this.content}</div>`;
    }
}