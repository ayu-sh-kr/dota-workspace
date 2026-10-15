/**
 * Standard (TC39) decorator context; only the shared metadata object is used.
 */
export interface StandardDecoratorContext {
  /** Decorated element kind, such as `class`, `field`, or `method`. */
  readonly kind: string;
  /** Metadata object shared by every decorator of one class, or undefined without `Symbol.metadata`. */
  readonly metadata?: object;
}

/** Anything a decorator or lifecycle method can pass to `Metadata.for`. */
export type MetadataTarget = Function | object | StandardDecoratorContext;

/**
 * Maps whatever a caller holds to the object that owns its metadata.
 *
 * Legacy decorators receive a class or a prototype, lifecycle code holds an instance, and
 * standard decorators receive a context. Resolving all of them to one owner is what lets every
 * caller read and write the same record.
 */
export class MetadataOwner {

  /**
   * Resolves a target to its metadata owner.
   * Classes own themselves; prototypes and instances resolve to their class; a standard context
   * resolves to its `metadata` object; plain and null-prototype objects own their own record so
   * they never write onto `Object`.
   * @param target Class, prototype, instance, standard decorator context, or metadata object.
   * @returns The owning class or metadata object.
   * @throws TypeError when a standard context has no metadata because `Symbol.metadata` is missing.
   */
  static resolve(target: MetadataTarget): object {
    if (typeof target === 'function') return target;

    const ctor = (target as {constructor?: unknown}).constructor;
    if (typeof ctor !== 'function') return target;
    if (ctor !== Object) return ctor;
    if (!this.isStandardContext(target)) return target;
    if (!target.metadata) {
      throw new TypeError('dota-core metadata: decorator context has no metadata; polyfill Symbol.metadata');
    }
    return target.metadata;
  }

  /**
   * Recognises a standard decorator context by its shape, because contexts are plain objects
   * with no class to test against. Only called for plain objects, so the `in` checks stay cheap.
   * @param target Plain object to inspect.
   * @returns True when it carries both `kind` and `metadata`.
   */
  static isStandardContext(target: object): target is StandardDecoratorContext {
    return 'kind' in target && 'metadata' in target;
  }
}
