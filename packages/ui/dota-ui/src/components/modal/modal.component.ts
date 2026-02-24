import './modal.css';
import {BaseElement, BindEvent, Component, EventEmitter, Property, Emitter, String} from "@ayu-sh-kr/dota-core";
import type {ModalDirection, ModalDuration, ModalRounded} from "@dota/components/modal/modal.config.ts";
import {ModalStyle} from "@dota/components/modal/modal.config.ts";


@Component({
    selector: 'dota-modal',
    shadow: false
})
class ModalComponent extends BaseElement {

    @Property({name: 'open', type: String})
    isOpen!: boolean;

    content!: string;

    @Property({name: 'className', type: String})
    className!: string

    @Property({name: 'rounded', type: String})
    rounded!: ModalRounded

    @Property({name: 'duration', type: String})
    duration!: ModalDuration

    @Property({name: 'direction', type: String})
    direction!: ModalDirection

    @Emitter()
    modalChange!: EventEmitter<boolean>

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    @BindEvent({event: 'click', id: '#close'})
    handleClose() {
        this.isOpen = false;

        this.modalChange.emit(false, this);
    }

    template = (open: boolean) => {
        return `
            <div style="
            --start-x: ${ModalStyle.direction[`${this.direction ?? 'up'}`].startX};
            --end-x: ${ModalStyle.direction[`${this.direction ?? 'up'}`].endX};
            --start-y: ${ModalStyle.direction[`${this.direction ?? 'up'}`].startY};
            --end-y: ${ModalStyle.direction[`${this.direction ?? 'up'}`].endY};
            --animation-duration: ${ModalStyle.duration[`${this.duration ?? '1300'}`]};
            " id="model" class="${open ? 'modelOpen' : 'modelClose'}  ${ModalStyle.base} ${ModalStyle.rounded[`${this.rounded ?? 'none'}`]}">
                <button type="button" id="close" class="absolute right-4 top-3">X</button>
               ${this.content}
            </div>
        `
    }

    render() {
        return this.template(this.isOpen);
    }

}

export {ModalComponent, ModalStyle as ModalConfig}

