import type {Plugin} from 'vite';
import dotaSsgImplementation, {
  resolveDecoratedSsgRoutes,
  resolveSsgRoutes,
  type DotaSsgOptions,

} from '@ayu-sh-kr/dota-ssr/vite';

export type {
  DotaDecoratedRoute,
  DotaSsgOptions,
  DotaSsgRoute,
  DotaSsgRouteInput,
  DotaSsgVercelOptions,
  ResolvedDotaSsgRoute,
} from '@ayu-sh-kr/dota-ssr/vite';
export {resolveDecoratedSsgRoutes, resolveSsgRoutes};

/**
 * Creates the wrapper-owned SSG plugin and points its rendering bridge at the
 * wrapper Rendering surface, keeping wrapper consumers free of direct package imports.
 * @param options Route selection, entry, readiness, shell, and Vercel configuration.
 * @returns A build-only Vite plugin for wrapper consumers.
 */
export function dotaSsg(options: DotaSsgOptions): Plugin {
  return dotaSsgImplementation({
    renderingModule: '@ayu-sh-kr/dota-wrap/rendering',
    ...options,
  });
}

export default dotaSsg;
