import {
  render as mountRender,
  type MountResult,
  type RenderOutput
} from '@ayu-sh-kr/dota-rendering';
import type {BaseElement} from './base-elements';

/**
 * Selects how a component's initial output becomes associated with its render root.
 * Dota Core supplies the ordinary client mount; opt-in runtime plugins may replace
 * it once during application setup to adopt an existing representation.
 * Returning `{ hydrated: true }` on the result signals that server DOM was adopted;
 * `dota-core` uses that flag to emit the `HYDRATED` lifecycle event.
 */
export type MountStrategy = (
  host: BaseElement,
  root: Element | ShadowRoot,
  output: RenderOutput
) => MountResult;

const defaultMountStrategy: MountStrategy = (_host, root, output) => mountRender(root, output);
let activeMountStrategy = defaultMountStrategy;
let hasInstalledMountStrategy = false;

/**
 * Installs the application-wide initial mount policy before components connect.
 * The slot is exclusive so plugins cannot silently replace one another and make
 * hydration behavior depend on registration order.
 * @param strategy Strategy selected by the application's composition root.
 * @throws Error when another strategy already owns the exclusive slot.
 */
export function setMountStrategy(strategy: MountStrategy): void {
  if (hasInstalledMountStrategy) {
    throw new Error('dota-core: a mount strategy is already registered');
  }
  activeMountStrategy = strategy;
  hasInstalledMountStrategy = true;
}

/** Returns the installed strategy or the backward-compatible client mount default. */
export function resolveMountStrategy(): MountStrategy {
  return activeMountStrategy;
}
