import {debounce} from "@dota/utils/debounce.ts";
import {PopoverPosition} from "@dota/components/popover/popover.component.ts";
import {Position} from "@dota/utils/position-calculator.utils.ts";


/**
 * Checks if an element is within the viewport.
 * This function is debounced to limit the rate at which it is invoked.
 *
 * @param element - The HTML element to check.
 * @returns A promise that resolves to a boolean indicating whether the element is visible in the viewport.
 */
const isElementInViewport = debounce((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();

    const viewportHeight = getViewportHeight()
    const viewportWidth = getViewportWidth()

    return (
        rect.x <= viewportWidth && rect.y <= viewportHeight
    );
}, 2000);


/**
 * Gets the position of an element within the viewport.
 *
 * @param element - The HTML element to get the position of.
 * @returns An object representing the position of the element within the viewport.
 */
const elementPositionInViewport = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();

    const position: PopoverPosition = {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
    }
    return position;
}


/**
 * Calculates the size of an element.
 *
 * @param element - The HTML element to calculate the size of.
 * @returns An object containing the width and height of the element.
 */
const calculateElementSize = (element: HTMLElement): ElementSize => {
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    return {width, height};
};


/**
 * Calculates the position of an element relative to the viewport.
 *
 * @param element - The HTML element to calculate the position of.
 * @returns An object representing the position of the element with `left` and `top` properties.
 */
const calculatePosition = (element: HTMLElement): Position => {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.x + window.scrollX,
        top: rect.y + window.scrollY
    }
}


/**
 * Gets the height of the viewport.
 *
 * @returns The height of the viewport in pixels.
 */
const getViewportHeight = () => {
    return window.innerHeight || document.documentElement.clientHeight;
}


/**
 * Gets the width of the viewport.
 *
 * @returns The width of the viewport in pixels.
 */
const getViewportWidth = () => {
    return window.innerWidth || document.documentElement.clientWidth;
}


/**
 * Extracts the size and positions of the reference and target HTML elements.
 *
 * This function calculates and logs the position and size of both the reference and target elements.
 * It returns an object containing the positions and sizes of the reference and target elements.
 *
 * @param reference - The reference HTML element.
 * @param target - The target HTML element.
 * @returns An object containing the positions and sizes of the reference and target elements.
 * @property referencePosition - The position of the reference element within the viewport.
 * @property referenceSize - The size (width and height) of the reference element.
 * @property targetSize - The size (width and height) of the target element.
 * @property targetPosition - The position of the target element within the viewport.
 */
function extractSizeAndPositions(reference: HTMLElement, target: HTMLElement) {
    const referencePosition = calculatePosition(reference);
    const referenceSize = calculateElementSize(reference);

    const targetSize = calculateElementSize(target);
    const targetPosition = calculatePosition(target);

    return {referencePosition, referenceSize, targetSize, targetPosition};
}


/**
 * Calculates the coordinates for positioning the target element at the bottom center of the reference element.
 *
 * This function determines the coordinates needed to position the target element such that it is centered horizontally
 * and placed directly below the reference element, with a specified offset.
 *
 * @param reference - The reference HTML element.
 * @param target - The target HTML element.
 * @param offset - The offset in pixels to apply below the reference element.
 * @returns An object representing the coordinates with `left` and `top` properties.
 * @property left - The calculated left coordinate for the target element.
 * @property top - The calculated top coordinate for the target element.
 */
const getBottomCenterCoords = (reference: HTMLElement, target: HTMLElement, offset: number): Position => {
    const {referencePosition, referenceSize, targetSize} = extractSizeAndPositions(reference, target);

    const totalOffset = offset + referenceSize.height

    const top = totalOffset + referencePosition.top;

    const widthDiff = targetSize.width - referenceSize.width;

    const left = referencePosition.left - widthDiff / 2;


    return {left: left, top: top}
}


/**
 * Calculates the coordinates for positioning the target element at the top center of the reference element.
 *
 * This function determines the coordinates needed to position the target element such that it is centered horizontally
 * and placed directly above the reference element, with a specified offset.
 *
 * @param reference - The reference HTML element.
 * @param target - The target HTML element.
 * @param offset - The offset in pixels to apply above the reference element.
 * @returns An object representing the coordinates with `left` and `top` properties.
 * @property left - The calculated left coordinate for the target element.
 * @property top - The calculated top coordinate for the target element.
 */
const getTopCenterCoords = (reference: HTMLElement, target: HTMLElement, offset: number) => {
    const {referencePosition, referenceSize, targetSize} = extractSizeAndPositions(reference, target);

    const top = referencePosition.top - offset - targetSize.height

    const widthDiff = targetSize.width - referenceSize.width;

    const left = referencePosition.left - widthDiff / 2;

    return {left: left, top: top}
}


/**
 * Calculates the coordinates for positioning the target element at the right center of the reference element.
 *
 * This function determines the coordinates needed to position the target element such that it is centered vertically
 * and placed directly to the right of the reference element, with a specified offset.
 *
 * @param reference - The reference HTML element.
 * @param target - The target HTML element.
 * @param offset - The offset in pixels to apply to the right of the reference element.
 * @returns An object representing the coordinates with `left` and `top` properties.
 * @property left - The calculated left coordinate for the target element.
 * @property top - The calculated top coordinate for the target element.
 */
const getRightCenterCoords = (reference: HTMLElement, target: HTMLElement, offset: number) => {
    const {referencePosition, referenceSize, targetSize} = extractSizeAndPositions(reference, target);

    const top = referencePosition.top - targetSize.height / 2 + referenceSize.height / 2;

    const left = referencePosition.left + referenceSize.width + offset;

    return {left: left, top: top}
}


/**
 * Calculates the coordinates for positioning the target element at the left center of the reference element.
 *
 * This function determines the coordinates needed to position the target element such that it is centered vertically
 * and placed directly to the left of the reference element, with a specified offset.
 *
 * @param reference - The reference HTML element.
 * @param target - The target HTML element.
 * @param offset - The offset in pixels to apply to the left of the reference element.
 * @returns An object representing the coordinates with `left` and `top` properties.
 * @property left - The calculated left coordinate for the target element.
 * @property top - The calculated top coordinate for the target element.
 */
const getLeftCenterCoords = (reference: HTMLElement, target: HTMLElement, offset: number) => {
    const {referencePosition, referenceSize, targetSize} = extractSizeAndPositions(reference, target);

    const top = referencePosition.top - targetSize.height / 2 + referenceSize.height / 2;

    const left = referencePosition.left  - offset - targetSize.width

    return {left: left, top: top}
}


/**
 * Represents the size of an HTML element.
 *
 * This type defines the structure for storing the width and height of an element.
 */
type ElementSize = {
    width: number,
    height: number
}

export {
    isElementInViewport,
    elementPositionInViewport,
    calculateElementSize,
    type ElementSize,
    calculatePosition,
    getBottomCenterCoords,
    getTopCenterCoords,
    getRightCenterCoords,
    getLeftCenterCoords
}