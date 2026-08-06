import {
  BindConfig, ElementConfigInternal, EventDetails,
  EventOptionMeta,
  MethodDetails, ParameterConfig,
  StateConfig
} from "@dota/core/types";
import {HelperUtils, PropertyUtils} from "@dota/core/utils";
import {EventManagerService} from "@dota/core/services";
import {EventEmitter} from "@dota/core";
import {
  type ClassApplicationEventBindManager,
  DefaultClassApplicationEventBindManager,
  EventChannel,
  DefaultClassScopedApplicationEventBindManager
} from "@ayu-sh-kr/dota-event";
import {ApplicationEventService} from "@dota/core/services/application-event.service.ts";
import {KeyUtils} from "@dota/core/utils/KeyUtils.ts";
import {LifecycleEventConstants} from "@dota/core/constants";
import {
  render as mountRender,
  update as updateRender,
  type RenderInstance,
  type RenderOutput
} from "@ayu-sh-kr/dota-rendering";
import {resolveMountStrategy} from "@dota/core/elements/render-strategy.ts";


/**
 * Records an observed attribute change until the coalesced DOM update is complete.
 * Lifecycle listeners receive these records in mutation order against the final DOM.
 */
type PendingAttributeChange = {
  /** Attribute whose serialized DOM value changed. */
  name: string;
  /** Serialized value before the mutation, or null when previously absent. */
  oldValue: string | null;
  /** Serialized value after the mutation. */
  newValue: string;
};


export abstract class BaseElement extends HTMLElement {
  [key: string]: any

  isShadow!: boolean;
  shadowRoot!: ShadowRoot;
  reactive = false;
  readonly __uid!: number;
  private __initialized = false;
  private __updateScheduled = false;
  private __pendingAttributeChanges: PendingAttributeChange[] = [];
  private __renderInstance?: RenderInstance;

  private __eventManagerService: EventManagerService<BaseElement>;
  private __applicationEventService = ApplicationEventService.getInstance();
  private __delegatedBindListeners = new Map<string, EventListener>();
  private __classApplicationEventManager!: ClassApplicationEventBindManager
  protected __eventChannel!: EventChannel
  private __classScopedApplicationEventManager!: ClassApplicationEventBindManager

  protected constructor() {
    super();
    const dotaElementConstructor = HelperUtils.toDotaElementConstructor(this);
    this.__uid = KeyUtils.getKey()
    this.__eventManagerService = new EventManagerService(this);
    this.__classApplicationEventManager = new DefaultClassApplicationEventBindManager(this, this.__applicationEventService.getListener());
    this.__eventChannel = this.__applicationEventService
      .createEventChannel(`${dotaElementConstructor.__dotaSelector}:${this.__uid}`);
    this.__classScopedApplicationEventManager = new DefaultClassScopedApplicationEventBindManager(this, this.__eventChannel);
    this.__eventChannel.emit({
      name: LifecycleEventConstants.CONSTRUCTED
    })
  }

  /**
   * Lifecycle method called when the component is added to the DOM.
   *
   * This method performs essential tasks synchronously and defers non-critical tasks
   * using microtasks (via Promise.resolve()) to avoid blocking the main thread.
   *
   * @method connectedCallback
   */
  connectedCallback() {
    this.handleBeforeInit();
    PropertyUtils.seedInitialValues(this);

    // Needs html to be rendered before binding methods and events,
    // so we defer those tasks to the next microtask.
    this.bindHTML();

    // Defer non-critical tasks to the next microtask to avoid blocking the main thread.
    const bindProperties = this.bindProperties();
    const bindParameters = this.bindParameters();
    const bindState = this.bindState(this);
    const bindElements = this.bindElements();
    const exposedMethods = this.exposeMethods();
    const bindMethods = this.bindMethods();
    const bindEmitter = this.bindEmitter();
    const bindHostEvents = this.bindHostEvents();
    const bindWindowEvents = this.bindWindowEvents();
    const bindDocumentEvents = this.bindDocumentEvents();
    this.__classApplicationEventManager.bind();
    this.__classScopedApplicationEventManager.bind();

    Promise.all([
      exposedMethods, bindMethods, bindEmitter, bindHostEvents,
      bindWindowEvents, bindDocumentEvents, bindProperties, bindParameters,
      bindState, bindElements
    ])
      .then(() => {
        this.__initialized = true;
        this.__eventChannel.emit({
          name: LifecycleEventConstants.CONNECTED
        })
        this.handleAfterInit();
      })
      .catch((reason) => console.error(reason));
  }

  disconnectedCallback() {
    this.__initialized = false;
    this.__updateScheduled = false;
    this.__pendingAttributeChanges.length = 0;
    this.__renderInstance?.dispose();
    this.__renderInstance = undefined;

    const unbindMethods = this.unbindMethods();
    const unbindHostEvents = this.unbindHostEvents();
    const unbindWindowEvents = this.unbindWindowEvents();
    const documentEvents = this.unbindDocumentEvents();
    const unbindProperties = this.unbindProperties();
    this.__classApplicationEventManager.unbind();
    this.__classScopedApplicationEventManager.unbind();

    Promise.all([
      unbindMethods, unbindHostEvents, unbindWindowEvents,
      documentEvents, unbindProperties
    ])
      .then(() => {
        this.__eventChannel.emit({
          name: LifecycleEventConstants.DISCONNECTED
        })
      })
      .catch((reason) => console.error(reason));
  }

  abstract render(): RenderOutput;

  /**
   * Updates the component's rendered HTML.
   *
   * Immediately renders the latest component state and refreshes node references.
   * A direct call consumes any pending reactive update so its queued microtask cannot
   * render twice. Attribute lifecycle events are emitted after replacement so their
   * listeners always inspect the final DOM for the current batch.
   */
  updateHTML() {
    if (!this.__initialized) return;

    this.__updateScheduled = false;
    const attributeChanges = this.__pendingAttributeChanges.splice(0);

    const root: Element | ShadowRoot = this.isShadow && this.shadowRoot ? this.shadowRoot : this;
    const output = this.render();
    if (this.__renderInstance) {
      updateRender(this.__renderInstance, output);
    } else {
      this.__renderInstance = mountRender(root, output);
    }
    const bindElements = this.bindElements();

    attributeChanges.forEach(({name, oldValue, newValue}) => {
      this.__eventChannel.emit({
        name: LifecycleEventConstants.ATTRIBUTE_CHANGED,
        data: {name, oldValue, newValue}
      });
    });

    bindElements
      .then(() => {
        this.__eventChannel.emit({
          name: LifecycleEventConstants.DOM_UPDATED
        })
      })
      .catch((reason) => console.error(reason));
  }

  /**
   * Coalesces reactive mutations into one DOM replacement at the end of the task.
   * Explicit updateHTML calls remain immediate and clear the flag, which makes a
   * queued callback harmless when a consumer chooses to flush synchronously.
   */
  private requestHTMLUpdate(): void {
    if (!this.__initialized || this.__updateScheduled) return;

    this.__updateScheduled = true;
    queueMicrotask(() => {
      if (!this.__updateScheduled) return;
      this.updateHTML();
    });
  }


  /**
   * Called when an observed attribute changes.
   * External values update typed property storage, while framework reflections skip
   * parsing and setter re-entry. Runtime changes are queued so listeners receive them
   * after the coalesced DOM replacement and before DOM_UPDATED.
   * @param name Attribute whose serialized value changed.
   * @param oldValue Serialized value before the change, or null when absent.
   * @param newValue Serialized value after the change, or null when removed.
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (newValue === null || newValue === oldValue) return;

    const isPropertyReflection = PropertyUtils.isReflectingAttribute(this, name);
    const changedProperty = isPropertyReflection
      ? undefined
      : PropertyUtils.bindAttribute(this, name, newValue);

    if (this.__initialized) {
      this.__pendingAttributeChanges.push({name, oldValue, newValue});
      if (!isPropertyReflection) this.requestHTMLUpdate();
    }

    if (this.reactive && changedProperty) {
      PropertyUtils.bindWatchers(this, changedProperty);
    }
  }

  /**
   * Retains the framework's permissive attribute value contract while delegating the
   * actual mutation and string conversion to the native DOM implementation.
   * @param qualifiedName Attribute name accepted by the native element API.
   * @param value Value the browser converts to its serialized attribute form.
   */
  setAttribute(qualifiedName: string, value: any) {
    super.setAttribute(qualifiedName, value);
  }

  /**
   * Executes methods annotated with `@BeforeInit` decorator before the component initializes.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find methods marked with the `@BeforeInit` decorator. It then invokes the
   * `beforeInit` method if it exists in the metadata, allowing for any setup
   * or initialization tasks to be performed before the component is fully initialized.
   *
   * @method handleBeforeInit
   */
  handleBeforeInit() {
    let data: Map<string, Function> = HelperUtils.fetchOrCreate<Function>(this, 'Before')
    const fun = data.get('beforeViewInit')

    if (fun) {
      fun.apply(this);
    }
  }

  /**
   * Executes methods annotated with `@AfterInit` decorator after the component initializes.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find methods marked with the `@AfterInit` decorator. It then invokes the
   * `afterInit` method if it exists in the metadata, allowing for any setup
   * or initialization tasks to be performed after the component is fully initialized.
   *
   * @method handleAfterInit
   */
  handleAfterInit() {
    const data: Map<string, Function> = HelperUtils.fetchOrCreate<Function>(this, 'After');
    const fun = data.get('afterViewInit')

    if (fun) {
      fun.apply(this);
    }
  }

  /**
   * Binds the component's `HTML` content and events based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to determine if the component should use a shadow DOM. It then sets the inner
   * HTML of the component or its shadow root to the result of the `render` method.
   * After setting the HTML, it binds events specified in the component's inner HTML
   * to their corresponding methods.
   *
   * @method bindHTML
   */
  private bindHTML() {
    const isShadow = HelperUtils.toDotaElementConstructor(this)
      .__dotaShadow;
    if (isShadow) {
      this.isShadow = isShadow;
    }

    const root: Element | ShadowRoot = this.isShadow ? this.resolveRenderRoot() : this;
    this.__renderInstance = resolveMountStrategy()(this, root, this.render());
  }

  /**
   * Preserves a declarative server shadow root when the browser created one.
   * A new open root is attached only for ordinary client mounts, preventing an
   * existing prerendered shadow tree from being cleared during component upgrade.
   * @returns Render root used by either the default mount or an installed strategy.
   */
  private resolveRenderRoot(): ShadowRoot {
    const existingRoot = Object.getOwnPropertyDescriptor(Element.prototype, 'shadowRoot')
      ?.get?.call(this) as ShadowRoot | null | undefined;
    const root = existingRoot ?? this.attachShadow({mode: "open"});
    this.shadowRoot = root;
    return root;
  }

  /**
   * Binds reactive properties to the component based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find property configurations marked with the `@Property` decorator. It then
   * sets up reactive getters and setters for each property, enabling automatic
   * re-rendering when property values change. This allows for two-way data binding
   * between component properties and their corresponding HTML attributes.
   *
   * @method bindProperties
   */
  private async bindProperties() {
    PropertyUtils.bindReactive(this)
  }


  /**
   * Unbinds reactive properties from the component.
   *
   * This method removes reactive getters and setters that were previously
   * set up for component properties, effectively disabling automatic re-rendering
   * when property values change.
   *
   * @method unbindProperties
   */
  private async unbindProperties() {
    PropertyUtils.unbindReactive(this)
  }


  /**
   * Binds the component's internal events to its methods based on metadata.
   *
   * Framework-level improvement:
   * Use event delegation so bindings survive:
   * - wrapper components re-rendering
   * - DOM replacement
   * - slot/shadow boundaries (for composed events like click)
   */
  private async bindMethods() {
    const data = HelperUtils.fetchOrCreate<BindConfig>(this, 'Bind');
    if (!data) return;

    // Bind on a stable root
    const root: HTMLElement | ShadowRoot = this.isShadow ? this.shadowRoot : this;

    data.forEach((config, methodName) => {
      const events = Array.isArray(config.event) ? config.event : [config.event];

      for (const eventName of events) {
        const key = `${eventName}@@${config.id}@@${methodName}`;

        // Prevent duplicates if setup is requested more than once in one connection.
        if (this.__delegatedBindListeners.has(key)) continue;

        const listener: EventListener = (e: Event) => {
          // composedPath handles shadow/slot; fallback to target
          const path = (typeof (e as any).composedPath === 'function'
              ? (e as any).composedPath()
              : [e.target]
          ) as Array<EventTarget | null>;

          for (const node of path) {
            if (!(node instanceof Element)) continue;
            if (node.matches(config.id)) {
              const fn = this[methodName];
              if (typeof fn === 'function') {
                fn.call(this, e);
              }
              break;
            }
          }
        };

        root.addEventListener(eventName, listener);
        this.__delegatedBindListeners.set(key, listener);
      }
    });
  }

  /**
   * Unbinds component's methods from their associated events.
   *
   * Updated to unbind delegated listeners correctly.
   */
  private async unbindMethods() {
    const data = HelperUtils.fetchOrCreate<BindConfig>(this, 'Bind');
    if (!data) return;

    const root: HTMLElement | ShadowRoot = this.isShadow ? this.shadowRoot : this;

    data.forEach((config, methodName) => {
      const events = Array.isArray(config.event) ? config.event : [config.event];

      for (const eventName of events) {
        const key = `${eventName}@@${config.id}@@${methodName}`;
        const listener = this.__delegatedBindListeners.get(key);
        if (!listener) continue;

        root.removeEventListener(eventName, listener);
        this.__delegatedBindListeners.delete(key);
      }
    });
  }

  /**
   * Exposes component methods to the global scope.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find methods marked for exposure. It then binds these methods to the global
   * `window` object, making them accessible globally.
   *
   * @method exposeMethods
   */
  private async exposeMethods() {
    let data = HelperUtils.fetchOrCreate<MethodDetails>(this, 'Exposed')

    if (data) {
      data.forEach((value, key) => {
        if (typeof window !== "undefined") {
          if (!(window as any)[key]) {
            (window as any)[key] = value.method.bind(this);
          }
        }
      });
    }
  }


  /**
   * Binds event emitters to the component's properties based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find event details and binds an `EventEmitter` instance to each property
   * specified in the metadata. The event name is derived from the metadata.
   *
   * @method bindEmitter
   */
  private async bindEmitter() {
    let data = HelperUtils.fetchOrCreate<EventDetails>(this, 'Output')

    if (!data) return;

    data.forEach((value: EventDetails, key: string) => {
      this[key] = new EventEmitter(value.eventName)
    })
  }


  /**
   * Binds host events to the component's methods based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find host event configurations. It then binds the specified methods
   * to the corresponding events on the host element or its shadow root. If the event is
   * a string, it adds a single event listener. If the event is an array of strings,
   * it traverses the array and adds event listeners for each event.
   *
   * @method bindHostEvents
   *
   * @example
   * // Example of using bindHostEvents to bind host events
   * class MyComponent extends BaseElement {
   *   \@HostListener({ event: 'click' })
   *   public handleClick(event: Event) {
   *     console.log('Host element clicked', event);
   *   }
   * }
   *
   * const myComponent = new MyComponent();
   * myComponent.bindHostEvents();
   * // The click event on the host element will now trigger the handleClick method
   */
  private async bindHostEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Host');

    if (!data) return;

    data.forEach((value: EventOptionMeta) => {
      const element = this.isShadow ? this.shadowRoot : this;
      if (element) {
        this.__eventManagerService.bindEvent(element, value, 'Host');
      }
    });
  }

  /**
   * Unbinds host events from the component's methods.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find host event configurations that were previously bound. It then removes
   * the event listeners from the host element or its shadow root.
   *
   * @method unbindHostEvents
   */
  private async unbindHostEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Host');

    if (!data) return;

    data.forEach((option: EventOptionMeta) => {
      const element = this.isShadow ? this.shadowRoot : this;

      if (element) {
        this.__eventManagerService.unbindEvent(element, option, 'Host');
      }
    });
  }


  /**
   * Binds window events to the component's methods based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find window event configurations. It then binds the specified methods
   * to the corresponding events on the global `window` object. If the event is
   * a string, it adds a single event listener. If the event is an array of strings,
   * it traverses the array and adds event listeners for each event.
   *
   * @method bindWindowEvents
   *
   * @example
   * // Example of using bindWindowEvents to bind window events
   * class MyComponent extends BaseElement {
   *   \@WindowListener({ event: 'resize' })
   *   public handleResize(event: Event) {
   *     console.log('Window resized', event);
   *   }
   * }
   *
   * const myComponent = new MyComponent();
   * myComponent.bindWindowEvents();
   * // The resize event on the window will now trigger the handleResize method
   */
  private async bindWindowEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Window');

    if (!data) return;

    data.forEach((value: EventOptionMeta) => {
      this.__eventManagerService.bindEvent(window, value, 'Window');
    })
  }

  /**
   * Unbinds window events from the component's methods.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find window event configurations that were previously bound. It then removes
   * the event listeners from the global `window` object.
   *
   * @method unbindWindowEvents
   */
  private async unbindWindowEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Window');
    if (!data) return;

    data.forEach((value: EventOptionMeta) => {
      this.__eventManagerService.unbindEvent(window, value, 'Window');
    });
  }


  /**
   * Binds document events to the component's methods based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find document event configurations. It then binds the specified methods
   * to the corresponding events on the global `document` object. If the event is
   * a string, it adds a single event listener. If the event is an array of strings,
   * it traverses the array and adds event listeners for each event.
   *
   * @method bindDocumentEvents
   */
  private async bindDocumentEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Document');

    if (!data) return;

    data.forEach((value: EventOptionMeta) => {
      this.__eventManagerService.bindEvent(document, value, 'Document');
    })
  }

  /**
   * Unbinds document events from the component's methods.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find document event configurations that were previously bound. It then removes
   * the event listeners from the global `document` object.
   *
   * @method unbindDocumentEvents
   */
  private async unbindDocumentEvents() {
    const data = HelperUtils.fetchOrCreate<EventOptionMeta>(this, 'Document');

    if (!data) return;

    data.forEach((value: EventOptionMeta) => {
      this.__eventManagerService.unbindEvent(document, value, 'Document');
    });
  }


  /**
   * Binds URL parameters to the component's properties based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find parameter configurations. It then binds the specified parameters
   * to the corresponding properties on the component, allowing for dynamic
   * updates based on URL query parameters.
   *
   * @method bindParameters
   */
  private async bindParameters() {
    const data = HelperUtils.fetchOrCreate<ParameterConfig>(this, 'Param');
    const params = new URLSearchParams(window.location.search);
    if (data) {
      data.forEach((value: ParameterConfig, key: string) => {
        this[key] = params.get(value.name)
      })
    }
  }

  /**
   * Binds state properties to the component's properties based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find state configurations. It then binds the specified state properties
   * to the corresponding properties on the component, allowing for reactive updates
   * and change detection.
   *
   * @method bindState
   */
  private async bindState(element: BaseElement) {
    let data = HelperUtils.fetchOrCreate<StateConfig>(element, 'State');

    data.forEach((value: StateConfig) => {
      const propertyKey = `_${value.prototype}`

      Object.defineProperty(element, value.prototype, {
        get(): any {
          return element[propertyKey]
        },

        set(v: any) {
          if (element[propertyKey] !== v) {
            element[propertyKey] = v;
            element.requestHTMLUpdate();
            PropertyUtils.bindWatchers(element, value.prototype);
          }
        },

        enumerable: true,
        configurable: true
      });
    });
  }

  /**
   * Binds elements to the component's properties based on metadata.
   *
   * This method retrieves metadata associated with the component's constructor
   * to find element configurations. It then binds the specified elements to
   * the corresponding properties on the component, allowing for easy access
   * to DOM elements within the component.
   *
   * @method bindElements
   */
  private async bindElements() {
    const data = HelperUtils.fetchOrCreate<ElementConfigInternal>(this, 'Element');
    if (!data) return;

    data.forEach((value) => {
      let selector = '';
      if (value.by === 'id') selector = `#${value.selector}`;
      if (value.by === 'class') selector = `.${value.selector}`;
      if (value.by === 'tag') selector = value.selector;
      if (this.isShadow) {
        this[value.property] = this.shadowRoot.querySelector(selector)
        return;
      }
      this[value.property] = this.querySelector(selector)
    })
  }


}
