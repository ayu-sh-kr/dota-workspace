import {AutoBind, OnEvent} from "@ayu-sh-kr/dota-event";
import type {ApplicationEvent} from "@ayu-sh-kr/dota-event";
import {NotificationHolderComponent} from "@dota/components/utils/notification/notification-holder.component.ts";
import {NotificationColor, NotificationComponent} from "@dota/components/utils/notification/notification.component.ts";


/**
 * Centralized notification management service that creates and displays toast notifications.
 * Operates in dual mode: event-driven handlers (via @OnEvent decorators) and direct method calls.
 * Automatically binds event handlers through @AutoBind decorator for seamless event system integration.
 * Creates custom NotificationComponent elements and propagates them to the global notification holder.
 * Supports four preset notification types (info, success, danger, warning) with customizable styling.
 * Event handlers respond to ApplicationEventMap notification events published across the application.
 */
@AutoBind()
export class NotificationService {

  /**
   * Creates and displays a custom notification with specified visual and content properties.
   * Constructs a NotificationComponent DOM element, configures its attributes, and injects it into the holder.
   * Serves as the core notification creation pipeline used by all preset notification methods.
   * Duration controls auto-dismiss timing, while color and icon determine visual presentation.
   * Propagates the configured notification to the DOM-mounted notification holder for rendering.
   */
  push({duration, icon, color, message, title}: NotificationDetails) {
    const notification = document.createElement('app-notification') as NotificationComponent;
    notification.duration = duration;
    notification.message = message;
    notification.color = color;
    notification.icon = icon
    notification.title = title
    this.propagateNotification(notification);
  }

  /**
   * Event-driven handler for application-wide 'notification:info' events published via ApplicationEventBus.
   * Automatically bound to the event system through @OnEvent decorator registration at service initialization.
   * Extracts SoftNotification payload from the event and delegates to the info method for rendering.
   * Enables decoupled notification triggering from any application component without direct service reference.
   * Part of the reactive notification architecture supporting cross-module event-driven communication.
   */
  @OnEvent('notification:info')
  infoEventHandler(event: ApplicationEvent<'notification:info'>) {
    this.info(event.data);
  }

  /**
   * Event-driven handler for application-wide 'notification:success' events published via ApplicationEventBus.
   * Automatically bound to the event system through @OnEvent decorator registration at service initialization.
   * Extracts SoftNotification payload from the event and delegates to the success method for rendering.
   * Enables decoupled notification triggering from any application component without direct service reference.
   * Part of the reactive notification architecture supporting cross-module event-driven communication.
   */
  @OnEvent('notification:success')
  successEventHandler(event: ApplicationEvent<'notification:success'>) {
    this.success(event.data);
  }

  /**
   * Event-driven handler for application-wide 'notification:danger' events published via ApplicationEventBus.
   * Automatically bound to the event system through @OnEvent decorator registration at service initialization.
   * Extracts SoftNotification payload from the event and delegates to the danger method for rendering.
   * Enables decoupled notification triggering from any application component without direct service reference.
   * Part of the reactive notification architecture supporting cross-module event-driven communication.
   */
  @OnEvent('notification:danger')
  dangerEventHandler(event: ApplicationEvent<'notification:danger'>) {
    this.danger(event.data);
  }

  /**
   * Event-driven handler for application-wide 'notification:warning' events published via ApplicationEventBus.
   * Automatically bound to the event system through @OnEvent decorator registration at service initialization.
   * Extracts SoftNotification payload from the event and delegates to the warning method for rendering.
   * Enables decoupled notification triggering from any application component without direct service reference.
   * Part of the reactive notification architecture supporting cross-module event-driven communication.
   */
  @OnEvent('notification:warning')
  warningEventHandler(event: ApplicationEvent<'notification:warning'>) {
    this.warning(event.data);
  }

  /**
   * Displays an informational notification with preset purple color and info icon styling.
   * Provides a convenient shorthand for push method with standardized info notification appearance.
   * Accepts minimal SoftNotification parameters while automatically applying visual theme defaults.
   * Can be invoked directly or triggered via 'notification:info' event through infoEventHandler.
   * Ideal for non-critical user feedback like status updates or general information messages.
   */
  info({message, duration, title}: SoftNotification) {
    this.push({
      color: "purple",
      message,
      duration,
      icon: 'ic:baseline-info',
      title
    });
  }

  /**
   * Displays a success notification with preset emerald color and checkmark icon styling.
   * Provides a convenient shorthand for push method with standardized success notification appearance.
   * Accepts minimal SoftNotification parameters while automatically applying visual theme defaults.
   * Can be invoked directly or triggered via 'notification:success' event through successEventHandler.
   * Ideal for positive user feedback like operation completion or validation success messages.
   */
  success({message, duration, title}: SoftNotification) {
    this.push({
      color: "emerald",
      message,
      duration,
      icon: 'ic:baseline-check-box',
      title
    });
  }

  /**
   * Displays a danger notification with preset red color and danger icon styling.
   * Provides a convenient shorthand for push method with standardized error notification appearance.
   * Accepts minimal SoftNotification parameters while automatically applying visual theme defaults.
   * Can be invoked directly or triggered via 'notification:danger' event through dangerEventHandler.
   * Ideal for critical user feedback like operation failures or validation error messages.
   */
  danger({message, duration, title}: SoftNotification) {
    this.push({
      color: "red",
      message,
      duration,
      icon: 'ic:sharp-dangerous',
      title
    });
  }

  /**
   * Displays a warning notification with preset amber color and warning icon styling.
   * Provides a convenient shorthand for push method with standardized caution notification appearance.
   * Accepts minimal SoftNotification parameters while automatically applying visual theme defaults.
   * Can be invoked directly or triggered via 'notification:warning' event through warningEventHandler.
   * Ideal for cautionary user feedback like deprecation notices or potential issue warnings.
   */
  warning({message, duration, title}: SoftNotification) {
    this.push({
      color: "amber",
      message,
      duration,
      icon: 'ic:twotone-warning',
      title
    });
  }

  /**
   * Injects the constructed notification component into the global DOM notification holder container.
   * Queries the document for the #dota-notification element and delegates rendering responsibility.
   * Assumes the NotificationHolderComponent is mounted and accessible in the DOM at invocation time.
   * Throws runtime error if the notification holder element is not found during query selection.
   * Completes the notification lifecycle by transferring ownership to the holder's display management.
   */
  private propagateNotification(notification: NotificationComponent) {
    document.querySelector<NotificationHolderComponent>('#dota-notification')!
      .propagate(notification);
  }

}


interface NotificationDetails {
  message: string,
  duration: number,
  color: NotificationColor,
  icon: string,
  title: string
}

interface SoftNotification {
  duration: number,
  message: string,
  title: string
}

export {type NotificationDetails, type SoftNotification}


