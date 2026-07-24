declare module '@ayu-sh-kr/dota-wrap/event' {
  /** Legacy method decorator contract used by the fixture's event handlers. */
  export function OnEvent(name: string, scoped?: boolean): MethodDecorator;
}
