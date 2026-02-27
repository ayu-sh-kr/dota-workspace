export {}

declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "md:theme-change": { theme: string };
    "md:color-change": { color: string };
    /**
     * Fired by MDService.render({ publish: true }).
     * Contains both the rendered HTML and the extracted TOC entries
     * so sibling components (e.g. a TOC sidebar) only need one listener.
     */
    "md:render": import("@dota/services/md.service.ts").MarkdownResult;
  }
}