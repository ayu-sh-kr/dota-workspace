
/**
 * Creates a debounced function that delays invoking the provided function until after
 * a specified wait time has elapsed since the last time the debounced function was invoked.
 *
 * @template T - The type of the function to debounce.
 * @param {T} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {(...args: Parameters<T>) => Promise<ReturnType<T>>} - Returns the new debounced function.
 *
 * @example
 * // Define a function to be debounced
 * function logMessage(message: string) {
 *     console.log(message);
 * }
 *
 * // Create a debounced version of the function with a 300ms delay
 * const debouncedLogMessage = debounce(logMessage, 300);
 *
 * // Call the debounced function multiple times
 * debouncedLogMessage("Hello");
 * debouncedLogMessage("World");
 *
 * // Only the last call ("World") will be logged after 300ms
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeout: number | undefined;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>): Promise<ReturnType<T>> {
        return new Promise((resolve) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                const result = func.apply(this, args);
                resolve(result);
            }, wait);
        });
    };
}