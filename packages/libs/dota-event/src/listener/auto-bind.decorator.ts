import { DefaultClassApplicationEventBindManager } from '@dota/manager/DefaultClassApplicationEventBindManager.ts';
import { DefaultApplicationEventRegistry } from '@dota/listener/DefaultApplicationEventRegistry.ts';

/**
 * Class decorator that automatically binds all non-scoped `@OnEvent`-decorated
 * methods to the global {@link ApplicationEventListener} as soon as an instance
 * of the decorated class is created.
 *
 * ### How it works
 * The decorator replaces the class constructor with a thin wrapper.  After the
 * original constructor finishes and the instance is fully initialised, the
 * wrapper creates a {@link DefaultClassApplicationEventBindManager} for the new
 * instance and immediately calls `bind()` on it.  The manager reads the
 * `@OnEvent` metadata, binds each handler method to the instance context, and
 * registers it with the listener obtained from
 * {@link DefaultApplicationEventRegistry}.
 *
 * ### Scoped handlers
 * Methods decorated with `@OnEvent(name, true)` (scoped) are intentionally
 * **skipped** by the bind manager and therefore never registered through this
 * decorator.  Scoped handlers have their own lifecycle managed by
 * `DefaultClassScopedApplicationEventBindManager` and `EventChannel`.
 *
 * ### Prerequisites
 * {@link DefaultApplicationEventRegistry.setListener} **must** have been called
 * during application bootstrap before any decorated class is instantiated,
 * otherwise the registry will throw at runtime.
 *
 * ### Unbinding
 * This decorator only handles the *bind* side of the lifecycle.  If you need to
 * clean up listeners when the instance is destroyed, create a
 * {@link DefaultClassApplicationEventBindManager} manually and call `unbind()`.
 *
 * @returns A class decorator that wraps the constructor to auto-bind event handlers.
 *
 * @example
 * ```ts
 * \@AutoBind()
 * class UserService {
 *   \@OnEvent('user:created')
 *   onUserCreated(event: ApplicationEvent<'user:created'>) {
 *     console.log('User created:', event.data);
 *   }
 * }
 *
 * // When `new UserService()` is called the handler is automatically registered.
 * const service = new UserService();
 * ```
 */
function AutoBindDecorator(): ClassDecorator {
  return <TFunction extends Function>(target: TFunction): TFunction => {

    // Capture the original constructor so we can call it and inspect it.
    const Original = target as unknown as new (...args: any[]) => object;

    /**
     * Replacement constructor that:
     * 1. Delegates to the original constructor with all supplied arguments so
     *    the instance is built exactly as the author intended.
     * 2. Retrieves the globally registered {@link ApplicationEventListener}
     *    from {@link DefaultApplicationEventRegistry}.
     * 3. Constructs a {@link DefaultClassApplicationEventBindManager} for the
     *    fresh instance and synchronously calls `bind()`, which walks the
     *    `@OnEvent` metadata and registers every non-scoped handler.
     *
     * `Reflect.construct` is used instead of `Original.apply` because ES2015+
     * class constructors cannot be called as plain functions — doing so throws
     * "Class constructor X cannot be invoked without 'new'".
     * `Reflect.construct(Original, args, AutoBoundConstructor)` allocates the
     * instance through the original constructor while keeping the new.target
     * set to `AutoBoundConstructor`, so prototype chain and `instanceof` stay
     * correct without any manual wiring.
     */
    function AutoBoundConstructor(this: object, ...args: any[]) {
      // 1. Run the original constructor via Reflect.construct so that class
      //    field initialisers and super() calls work normally.  The third
      //    argument keeps new.target pointing at AutoBoundConstructor so the
      //    returned instance has the right prototype.
      const instance = Reflect.construct(Original, args, AutoBoundConstructor);

      // 2. Resolve the shared listener from the global registry.
      //    Throws if setListener() was never called — intentional, as this is
      //    a programming error that must surface immediately.
      const listener = DefaultApplicationEventRegistry.getListener();

      // 3. Create the bind manager for the freshly constructed instance and
      //    call bind().  Non-scoped @OnEvent handlers are registered here;
      //    scoped ones are skipped by the manager itself.
      const manager = new DefaultClassApplicationEventBindManager(instance, listener);
      manager.bind();

      // Return the instance explicitly so the `new` expression receives it.
      return instance;
    }

    // Preserve the prototype chain so instanceof checks and prototype methods
    // keep working correctly on instances of the decorated class.
    AutoBoundConstructor.prototype = Original.prototype;

    // Copy static members from the original class to the wrapper so that any
    // static properties, methods, or decorators on the class remain accessible.
    Object.setPrototypeOf(AutoBoundConstructor, Original);

    // Restore the constructor name to the original class name for clearer
    // stack traces, debugger views, and serialisation output.
    Object.defineProperty(AutoBoundConstructor, 'name', { value: Original.name });

    return AutoBoundConstructor as unknown as TFunction;
  };
}

export { AutoBindDecorator as AutoBind };

