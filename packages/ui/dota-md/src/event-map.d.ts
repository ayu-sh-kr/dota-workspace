export {};

import type { MarkdownResult } from "./services/md.service.ts";

// Auto-generated application event map. Do not edit by hand.
// Payload types are recovered syntactically from publish, publishAsync, and emit calls.
// Unsupported publisher expressions become unknown; handler-only events remain any for compatibility.

declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "attribute-changed": any;
    "connected": any;
    "constructed": any;
    "disconnected": any;
    "dom-updated": any;
    "md:color-change": any;
    "md:render": MarkdownResult;
    "md:theme-change": any;
  }
}
