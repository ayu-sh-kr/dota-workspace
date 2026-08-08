/**
 * Constants defining standard lifecycle event names used throughout the Dota framework.
 * These events are emitted through EventChannel instances to notify subscribers of component state changes.
 * Each constant represents a specific stage in a component's lifecycle, from construction to DOM updates.
 * Used in conjunction with ApplicationEventBus to create consistent event naming across the framework.
 *
 * @see EventChannel
 * @see ApplicationEventService
 *
 * @example
 * ```typescript
 * const eventChannel = applicationEventService.createEventChannel('my-component');
 * eventChannel.on(LifecycleEventConstants.CONNECTED, () => {
 *   console.log('Component connected to DOM');
 * });
 * ```
 */
export const LifecycleEventConstants = {
  /** Emitted when a component instance is constructed but not yet attached to the DOM */
  CONSTRUCTED: 'constructed',

  /** Emitted when a component is attached to the DOM and ready for interaction */
  CONNECTED: 'connected',

  /** Emitted when a component is removed from the DOM and cleanup should occur */
  DISCONNECTED: 'disconnected',

  /** Emitted when one of the component's observed attributes changes value */
  ATTRIBUTE_CHANGED: 'attribute-changed',

  /** Emitted when the component's initial mount adopted existing server DOM instead of a fresh paint */
  HYDRATED: 'hydrated',

  /** Emitted when the component's internal DOM structure has been updated or re-rendered */
  DOM_UPDATED: 'dom-updated',
}