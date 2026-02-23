import '@ayu-sh-kr/dota-event';

declare module '../src/Types.ts' {
  interface ApplicationEventMap {

    'user:created':  { id: number; name: string; email?: string };
    'user:updated':  { id: number; name?: string; email?: string };
    'user:deleted':  { id: number };

    'notification:send':      { message: string };
    'notification:batch':     { messages: string[] };
    'notification:broadcast': { message: string };

    'email:send': { to: string; subject: string; body: string };

    'order:placed':          { orderId: number };
    'order:created':         { id?: number };
    'order:shipped':         { id?: number };
    'order:cancelled':       { id?: number };
    'order:scoped-internal': Record<string, never>;
    'order:scoped-payment':  Record<string, never>;

    'counter:increment': Record<string, never>;
    'increment':         Record<string, never>;
    'decrement':         Record<string, never>;

    'opened':    unknown;
    'closed':    unknown;
    'submitted': { form?: string; userId?: number };
    'clicked':   unknown;
    'start':     unknown;
    'stop':      unknown;
    'reset':     unknown;
    'update':    unknown;
    'tick':      unknown;
    'ping':      unknown;
    'pulse':     unknown;
    'resize':    unknown;
    'show':      unknown;
    'open':      unknown;
    'save':      unknown;
    'init':      unknown;
    'early':     unknown;
    'late':      unknown;
    'loaded':    unknown;
    'event':            unknown;
    'event:a':          unknown;
    'event:b':          unknown;
    'event:c':          unknown;
    'event:with:colons': unknown;
    'multi:event':      unknown;
    'multi:callback':   unknown;
    'test:event':       unknown;
    'global:event':     unknown;
    'scoped:event':     unknown;
    'shared:event':     unknown;
    'unknown:event':    unknown;
    'new:event':        unknown;
    'unsub:test':       unknown;
    'only:scoped':      unknown;
    'sb:scoped':        unknown;
    'mix:regular':      unknown;
    'mix:scoped':       unknown;
    'dynamic:event':    unknown;
    'context:test':     unknown;
    'dota-tooltip:click': unknown;
  }
}

