/**
 * Defines the naming convention that allows application event declarations into
 * the generic AST module index without making every string constant resolvable.
 */
export class EventNamePolicy {
  /**
   * Accepts uppercase EVENT tokens and camel/Pascal-case Event tokens.
   * Lowercase substrings such as `eventful` and `eventName` remain excluded.
   * @param name Declaration or static property name to classify.
   * @returns Whether the name identifies an event constant.
   */
  static isEventConstantName(name: string): boolean {
    return /(?:^|_)EVENT(?:_|$)/.test(name) || /(?:^|[a-z0-9])Event(?:$|[A-Z0-9])/.test(name);
  }
}
