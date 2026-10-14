export {};

import type { MarkdownResult } from "../../../ui/dota-md/src/services/md.service.ts";
import type { BlogPaginationState } from "./components/blogs/blog-pagination.component.ts";
import type { NotificationColor } from "./components/utils/notification/notification.component.ts";

// Auto-generated application event map. Do not edit by hand.
// Payload types are recovered syntactically from publish, publishAsync, and emit calls.
// Unsupported publisher expressions become unknown; decorator-only events remain any for compatibility.

declare module "@ayu-sh-kr/dota-wrap/event" {
  interface ApplicationEventMap {
    "app:initialized": null;
    "attribute-changed": any;
    "blog:pagination:changed": BlogPaginationState;
    "connected": any;
    "constructed": any;
    "disconnected": any;
    "dom-updated": any;
    "md:color-change": { color: string };
    "md:render": MarkdownResult;
    "md:theme-change": { theme: string };
    "notification:danger": any;
    "notification:info": any;
    "notification:removed": { type: string; message: string; color: NotificationColor; icon: string; title: string };
    "notification:success": any;
    "notification:warning": any;
    "tools:select": { toolId: string };
  }
}
