import type {DotaElementConstructor} from '@ayu-sh-kr/dota-core';
import type {ComponentClass, RouteConfig} from '@ayu-sh-kr/dota-router';

/**
 * What an application declares in `initializeApp`, handed to the server instead of starting it.
 * The server renders request-time pages from this, so components and routes are declared
 * once, in the application entry, for the browser and the server alike.
 */
export type CapturedApplication = {
  /** Every registered component, external UI components included. */
  readonly components: readonly DotaElementConstructor[];
  /** Flat routes as the router would receive them, each with its render `mode`. */
  readonly routes: readonly RouteConfig<HTMLElement>[];
  readonly errorRoute: RouteConfig<HTMLElement>;
  readonly defaultRoute: RouteConfig<HTMLElement>;
  /** Root component whose host element contains the routed page. */
  readonly root: ComponentClass;
};

/** Receives the application from `initializeApp` while a server is loading the entry. */
export type ApplicationCaptureHook = (application: CapturedApplication) => void;

/** Global slot shared by every loaded copy of Dota Wrap and Dota SSR. */
const CAPTURE_SLOT = Symbol.for('dota.ssr.application-capture');

/**
 * Installs or clears the hook `initializeApp` reports to. Only server code sets it;
 * see `captureApplication` in `@ayu-sh-kr/dota-ssr/server`.
 */
export function setApplicationCaptureHook(hook: ApplicationCaptureHook | undefined): void {
  (globalThis as Record<symbol, unknown>)[CAPTURE_SLOT] = hook;
}

/**
 * The hook to report to when the entry is being loaded by a server, otherwise undefined.
 * `initializeApp` checks this first: with a hook it reports its configuration and never
 * starts, so the browser-only startup work (routing, mounting) never runs on the server.
 */
export function getApplicationCaptureHook(): ApplicationCaptureHook | undefined {
  return (globalThis as Record<symbol, unknown>)[CAPTURE_SLOT] as ApplicationCaptureHook | undefined;
}
