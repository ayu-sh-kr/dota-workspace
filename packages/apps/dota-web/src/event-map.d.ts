export {};

import type { MarkdownResult } from "../../../ui/dota-md/src/services/md.service.ts";
import type { BlogPaginationState } from "./components/blogs/blog-pagination.component.ts";
import type { NotificationColor } from "./components/utils/notification/notification.component.ts";
import type { SoftNotification } from "./components/utils/notification/notification.service.ts";
import type { ColorName, ThemeName } from "@ayu-sh-kr/dota-md";

// Auto-generated application event map. Do not edit by hand.
// Payload types are recovered syntactically from publish, publishAsync, and emit calls.
// Unsupported publisher expressions become unknown; handler-only events remain any for compatibility.

declare module "@ayu-sh-kr/dota-wrap/event" {
  interface ApplicationEventMap {
    "app:initialized": null;
    "attribute-changed": any;
    "blog:pagination:changed": BlogPaginationState;
    "connected": any;
    "constructed": any;
    "disconnected": any;
    "docs:color-change": { color: ColorName };
    "docs:theme-change": { theme: ThemeName };
    "docs:toc-update": any;
    "dom-updated": any;
    "md:color-change": { color: ColorName };
    "md:render": MarkdownResult;
    "md:theme-change": { theme: ThemeName };
    "notification:danger": SoftNotification;
    "notification:info": SoftNotification;
    "notification:removed": { type: string; message: string; color: NotificationColor; icon: string; title: string };
    "notification:success": SoftNotification;
    "notification:warning": SoftNotification;
    "tools:select": { toolId: string };
  }
}
