
declare module "@ayu-sh-kr/dota-event" {
  interface ApplicationEventMap {
    "md:theme-change": { theme: string };
    "md:color-change": { color: string };
    "md:toc-update": any;
    "md:toc-active": { id: string };
  }
}