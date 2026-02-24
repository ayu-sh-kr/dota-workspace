import {BaseElement, Component, Property, Boolean, String} from "@ayu-sh-kr/dota-core";
import {type IconColor, IconStyle, type IconVariant} from "@dota/components";


/**
 * Avatar Component
 *
 * A versatile avatar component that can display images, labels, or icons with optional chip wrapper.
 *
 * @example
 * // Image Avatar
 * <d-avatar img="/path/to/image.jpg" img-alt="User avatar" size="md"></d-avatar>
 *
 * @example
 * // Label Avatar
 * <d-avatar label="John Doe" variant="solid" size="lg"></d-avatar>
 *
 * @example
 * // Icon Avatar with Chip
 * <d-avatar
 *   icon="user"
 *   is-chip="true"
 *   chip-color="primary"
 *   chip-position="bottom-right"
 *   size="sm">
 * </d-avatar>
 */
@Component({
    selector: 'd-avatar',
    shadow: false
})
export class AvatarComponent extends BaseElement {

    @Property({
        name: 'img',
        type: String
    })
    img!: string

    @Property({
        name: 'img-alt',
        type: String
    })
    imgAlt!: string

    @Property({
        name: 'label',
        type: String
    })
    label!: string;

    @Property({
        name: 'icon',
        type: String
    })
    icon!: string;

    @Property({
        name: 'is-chip',
        type: Boolean
    })
    isChip!: boolean;

    @Property({
        name: 'chip-text',
        type: String
    })
    chipText!: string;

    @Property({
        name: 'color',
        type: String
    })
    chipColor!: string;

    @Property({
        name: 'chip-position',
        type: String
    })
    chipPosition!: string

    @Property({
        name: 'variant',
        type: String
    })
    variant!: string;

    @Property({
        name: 'size',
        type: String
    })
    size!: string

    constructor() {
        super();
    }

    template = (): string => {

        const size = this.size || 'md';

        if(this.img) {
            return this.isChip ?
                `
                    <dota-chip color="${this.chipColor}" size="sm" position="${this.chipPosition}">
                        <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                            <img src="${this.img}" alt="${this.imgAlt}" class="w-full h-full rounded-full">
                        </avatar-wrapper>
                    </dota-chip>
                    
                ` :
                `
                    <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                        <img src="${this.img}" alt="${this.imgAlt}" class="w-full h-full rounded-full">
                    </avatar-wrapper>
                `;
        } else if(this.label) {
            return this.isChip ?
                `
                    <dota-chip color="${this.chipColor}" size="sm" position="${this.chipPosition}">
                        <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                            ${this.label.split(" ").map((value: string, index: number) => {
                                if(index < 2) {
                                    return value.toUpperCase().at(0);
                                }
                            }).join("")}
                        </avatar-wrapper>
                    </dota-chip>
                `
                :
                `
                    <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                        <span>
                            ${this.label.split(" ").map((value: string, index: number) => {
                                if(index < 2) {
                                    return value.toUpperCase().at(0);
                                }
                            }).join("")}
                        </span>
                    </avatar-wrapper>
                `;
        } else {

            return this.isChip ?
                `
                    <dota-chip color="${this.chipColor}" size="sm" position="${this.chipPosition}">
                        <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                            <dota-icon name="${this.icon}" color="${this.chipColor}" size="${size}" variant="${this.variant}"></dota-icon>
                        </avatar-wrapper>
                    </dota-chip>
                `
                :
                `
                    <avatar-wrapper color="${this.chipColor}" variant="${this.variant}" size="${size}">
                        <dota-icon name="${this.icon}" color="${this.chipColor}" size="${size}" variant="${this.variant}"></dota-icon>
                    </avatar-wrapper>
                `;
        }
    }

    render(): string {
        return this.template();
    }

}


/**
 * Avatar Wrapper Component
 *
 * A container component that provides styling and layout for avatar content.
 * Supports different colors, variants, and sizes.
 *
 * @example
 * <avatar-wrapper color="primary" variant="solid" size="md">
 *   <img src="avatar.jpg" alt="User avatar">
 * </avatar-wrapper>
 */
@Component({
    selector: 'avatar-wrapper',
    shadow: false
})
export class AvatarWrapper extends BaseElement {

    /** Content to be rendered inside the avatar wrapper */
    content!: string

    /**
     * Color theme of the avatar
     * @type {IconColor}
     */
    @Property({
        name: 'color',
        type: String
    })
    color!: IconColor;

    /**
     * Visual variant of the avatar
     * @type {IconVariant}
     */
    @Property({
        name: 'variant',
        type: String
    })
    variant!: IconVariant;

    /**
     * Size of the avatar
     * @type {IconSize}
     */
    @Property({
        name: 'size',
        type: String
    })
    size!: AvatarSize

    constructor() {
        super();
        this.content = this.innerHTML;
    }

    render(): string {

        const color = AvatarConfig.color[this.color] || AvatarConfig.color.gray;
        const variant = color[this.variant] || color.solid

        const size = AvatarConfig.size[this.size] || AvatarConfig.size.lg;

        return `
            <div class="rounded-full content-center ${variant} ${size} flex items-center justify-center font-semibold overflow-hidden">
                ${this.content}
            </div>
        `;
    }

}

const AvatarConfig = {
    color: IconStyle.color,
    size: {
        xs: 'w-5 h-5',
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
        xl: 'w-12 h-12',
        '2xl': 'w-16 h-16'
    }
}

export type AvatarSize = keyof typeof AvatarConfig.size;