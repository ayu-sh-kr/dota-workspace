import {
    getBottomCenterCoords,
    getLeftCenterCoords,
    getRightCenterCoords,
    getTopCenterCoords
} from "@dota/utils/position.utils.ts";


/**
 * A utility class for calculating the position of a target HTML element relative to a reference HTML element.
 *
 * This class provides methods to set the reference and target elements, specify the placement direction,
 * and apply an offset. It then calculates the coordinates for positioning the target element based on the specified placement.
 */
class PositionCalculator {
    private _reference!: HTMLElement;
    private _target!: HTMLElement;
    private _placement: Placement = 'bottom'
    private _offset: number = 0;

    constructor() {
    }

    /**
     * Sets the reference element.
     *
     * @param element - The reference HTML element.
     * @returns The current instance of PositionCalculator for method chaining.
     */
    reference(element: HTMLElement) {
        this._reference = element;
        return this;
    }

    /**
     * Sets the target element.
     *
     * @param element - The target HTML element.
     * @returns The current instance of PositionCalculator for method chaining.
     */
    target(element: HTMLElement) {
        this._target = element;
        return this;
    }


    /**
     * Sets the placement direction for the target element.
     *
     * @param value - The placement direction ('bottom', 'left', 'top', or 'right').
     * @returns The current instance of PositionCalculator for method chaining.
     */
    placement(value: Placement) {
        this._placement = value
        return this;
    }


    /**
     * Sets the offset in pixels to apply to the target element.
     *
     * @param value - The offset in pixels.
     * @returns The current instance of PositionCalculator for method chaining.
     */
    offset(value: number) {
        this._offset = value;
        return this;
    }

    /**
     * Calculates the coordinates for positioning the target element based on the specified placement and offset.
     *
     * @returns An object representing the coordinates with `left` and `top` properties.
     */
    calculate(): Position {
        switch (this._placement) {
            case "bottom": {
                return getBottomCenterCoords(this._reference, this._target, this._offset)
            }

            case "left": {
                return getLeftCenterCoords(this._reference, this._target, this._offset)
            }

            case "top": {
                return getTopCenterCoords(this._reference, this._target, this._offset)
            }

            case "right": {
                return getRightCenterCoords(this._reference, this._target, this._offset)
            }
        }
    }

}

/**
 * Represents the coordinates for positioning an element.
 *
 * This type defines the structure for storing the `left` and `top` coordinates of an element.
 *
 * @property {number} left - The left coordinate in pixels.
 * @property {number} top - The top coordinate in pixels.
 */
type Position = {
    top: number,
    left: number
};

/**
 * Defines the possible placement directions for positioning an element.
 *
 * This type represents the allowed values for specifying the placement direction of a target element
 * relative to a reference element.
 *
 * @type {"bottom" | "left" | "top" | "right"}
 */
type Placement = "bottom" | "left" | "top" | "right";



export {PositionCalculator, type Position, type Placement}