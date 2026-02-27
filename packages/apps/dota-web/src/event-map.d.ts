import type { SoftNotification } from '@dota/components/utils/notification/notification.service.ts';

declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "app:initialized": null;
    "notification:info": SoftNotification;
    "notification:success": SoftNotification;
    "notification:danger": SoftNotification;
    "notification:warning": SoftNotification;
    /** Fired when the user picks a different theme variant (flat / material). */
    "docs:theme-change": { theme: string };
    /** Fired when the user picks a different color (indigo / teal / rose …). */
    "docs:color-change": { color: string };
  }
}

