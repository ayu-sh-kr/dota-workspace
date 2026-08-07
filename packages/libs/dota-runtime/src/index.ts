import type {MountStrategy} from '@ayu-sh-kr/dota-core';
import type {ComponentClass, RouteRenderer} from '@ayu-sh-kr/dota-router';

/** Decorates route presentation while preserving the next configured renderer as fallback. */
export type RouteRendererWrapper = (
  next: RouteRenderer<HTMLElement>,
  root: ComponentClass
) => RouteRenderer<HTMLElement>;

/**
 * Exposes the narrow runtime sockets owned by Dota Wrap's composition root.
 * The contract bridges Core's mount policy and Router's route presentation without
 * making either the feature implementation or the composition root own the other's types.
 */
export interface DotaRuntimeContext {
  /** Claims Dota Core's exclusive initial mount strategy slot. */
  setMountStrategy(strategy: MountStrategy): void;
  /** Wraps the current per-application route renderer and retains it as fallback. */
  wrapRouteRenderer(wrapper: RouteRendererWrapper): void;
}

/**
 * Adds opt-in runtime wiring without making host libraries depend on the feature.
 * The object mirrors the named setup convention used by Dota runtime extensions.
 */
export interface DotaRuntimePlugin {
  /** Stable diagnostic name identifying the plugin during application setup. */
  readonly name: string;
  /** Optional hook that configures runtime sockets before component registration. */
  setup?(context: DotaRuntimeContext): void;
}
