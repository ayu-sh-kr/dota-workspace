/**
 * Joins a tagged template into the HTML string consumed by BaseElement rendering.
 * Null and undefined represent absent values; other falsy values retain their visible
 * string form so counters and boolean state do not disappear from component output.
 * @param strings Static template segments supplied by the JavaScript runtime.
 * @param values Interpolated component values placed between static segments.
 * @returns Flattened HTML string for the current render.
 */
export function HTML(strings: TemplateStringsArray, ...values: any[]): string {
  let html = '';
  strings.forEach((string, index) => {
    html += string + (values[index] ?? '');
  });
  return html;
}
