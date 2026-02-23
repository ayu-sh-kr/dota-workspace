import type { SoftNotification } from '@dota/components/utils/notification/notification.service.ts';

declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "app:initialized": null;
    "notification:info": SoftNotification;
    "notification:success": SoftNotification;
    "notification:danger": SoftNotification;
    "notification:warning": SoftNotification;
  }
}

