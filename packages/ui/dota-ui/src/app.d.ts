
declare interface UIConfig {
    base: string
    color: UIColor,
    size: UISize,
    rounded: UIRounded
    animation: any
}

declare interface UIColor {
    [name: string]: ColorVariants
}

declare interface ColorVariants {
    solid: string;
    soft: string;
    outline: string;
    ghost: string;
    link : string
}

declare interface UISize {
    [name: string]: string
}

declare interface UIRounded {
    [name: string]: string
}