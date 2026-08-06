import {HelperUtils, type ComponentConfig} from '@ayu-sh-kr/dota-core';
import {
  HYDRATION_COMPONENT_ATTRIBUTE,
  HYDRATION_TEMPLATE_ATTRIBUTE,
  HYDRATION_VERSION_ATTRIBUTE,
  type HydrationMismatchPolicy as RenderingHydrationMismatchPolicy,
  MARKER_VERSION,
  hydrate,
  isTemplateResult,
  render as mountRender,
  templateId,
  warnHydrationMismatch
} from '@ayu-sh-kr/dota-rendering';
import type {
  DotaRuntimePlugin,
  DotaRuntimeContext
} from '@ayu-sh-kr/dota-wrap';
import type {ComponentClass, NavigationContext, RouteMatch, RouteRenderer} from '@ayu-sh-kr/dota-wrap/router';

/** Selects whether a mismatch warns and remounts the host or stops initialization. */
export type HydrationMismatchPolicy = RenderingHydrationMismatchPolicy;

/**
 * Configures Dota's opt-in browser hydration plugin.
 * The plugin changes only marked initial component mounts and initial marked route presentation;
 * all other Dota Core and Router behavior continues through the ordinary client render path.
 */
export interface DotaHydrationOptions {
  /** `warn` remounts only the mismatched host; `throw` surfaces deploy skew during development. */
  mismatch?: HydrationMismatchPolicy;
}

/**
 * Creates the browser half of Dota SSG as an ordinary runtime plugin.
 * It claims Core's mount strategy and decorates only the router's initial paint, allowing
 * server DOM to be adopted when it still represents the selected client template and pathname.
 * @param options Mismatch behavior, defaulting to a warning and local component recovery.
 * @returns Plugin installed explicitly through `initializeApp({plugins})`.
 */
export function dotaHydration(options: DotaHydrationOptions = {}): DotaRuntimePlugin {
  const mismatch = options.mismatch ?? 'warn';
  return {
    name: 'dota-hydration',
    setup(context) {
      installMountStrategy(context, mismatch);
      context.wrapRouteRenderer((next, root) => createHydrationRouteRenderer(next, root));
    }
  };
}

/**
 * Installs marker validation at Core's exclusive initial-mount boundary.
 * Missing markers preserve normal client rendering; present but invalid markers follow the
 * configured policy so stale static HTML is never adopted under a mismatched template identity.
 * @param context Runtime sockets supplied by Dota Wrap.
 * @param mismatch Policy selected for invalid identity, version, or part markers.
 */
function installMountStrategy(context: DotaRuntimeContext, mismatch: HydrationMismatchPolicy): void {
  context.setMountStrategy((host, root, output) => {
    const serverTemplateId = host.getAttribute(HYDRATION_TEMPLATE_ATTRIBUTE);
    const serverVersion = host.getAttribute(HYDRATION_VERSION_ATTRIBUTE);
    if (serverTemplateId === null && serverVersion === null) return mountRender(root, output);

    const canHydrate = isTemplateResult(output) &&
      serverTemplateId === templateId(output.strings) &&
      serverVersion === String(MARKER_VERSION);
    if (canHydrate) {
      try {
        return hydrate(root, output, {mismatch});
      } catch (error) {
        throw hydrationMismatch(host, error);
      }
    }

    const error = hydrationMismatch(host);
    if (mismatch === 'throw') throw error;
    warnHydrationMismatch(error);

    host.removeAttribute(HYDRATION_COMPONENT_ATTRIBUTE);
    host.removeAttribute(HYDRATION_TEMPLATE_ATTRIBUTE);
    host.removeAttribute(HYDRATION_VERSION_ATTRIBUTE);
    return mountRender(root, output);
  });
}

/**
 * Wraps route presentation so the initial transition retains a marked page host.
 * A missing marker, custom route render, path disagreement, or later navigation delegates
 * unchanged to the router renderer, which keeps route customization authoritative.
 * @param next Renderer used for all non-hydration route transitions.
 * @param root Root component whose id identifies the route outlet host.
 * @returns Decorated renderer with one initial-load adoption branch.
 */
function createHydrationRouteRenderer(
  next: RouteRenderer<HTMLElement>,
  root: ComponentClass
): RouteRenderer<HTMLElement> {
  return (match, context) => {
    if (context.initial && rootHasMarkedPage(root, match, context)) return;
    return next(match, context);
  };
}

/**
 * Confirms that server markup represents the route selected for the first paint.
 * Selector metadata and the serialized `path` value prevent unrelated marked components from
 * suppressing normal tag injection, while custom route renderers always retain DOM ownership.
 * @param root Root component used to locate the application outlet.
 * @param match Route selected by the coordinator.
 * @param context Initial navigation URL used for the path agreement check.
 * @returns Whether the route renderer should leave the existing page host untouched.
 */
function rootHasMarkedPage(
  root: ComponentClass,
  match: RouteMatch<HTMLElement>,
  context: NavigationContext<HTMLElement>
): boolean {
  if (match.route.render) return false;
  const rootConfig = HelperUtils.getComponentMetadata(root, 'Component') as ComponentConfig | undefined;
  const pageConfig = HelperUtils.getComponentMetadata(match.route.component, 'Component') as ComponentConfig | undefined;
  if (!rootConfig?.selector || !pageConfig?.selector) return false;

  const rootElement = document.getElementById(rootConfig.selector);
  const page = rootElement?.querySelector(pageConfig.selector);
  return page?.getAttribute(HYDRATION_TEMPLATE_ATTRIBUTE) !== null &&
    page?.getAttribute('path') === context.url.pathname;
}

/**
 * Creates a host-scoped mismatch error while preserving an internal marker failure.
 * @param host Component boundary whose serialized representation could not be adopted.
 * @param cause Optional lower-level marker or part-adoption failure.
 * @returns Error suitable for the strict development mismatch policy.
 */
function hydrationMismatch(host: BaseElementLike, cause?: unknown): Error {
  return new Error(`Hydration mismatch on <${host.localName}>`, cause === undefined ? undefined : {cause});
}

/**
 * Minimal component host surface needed to report a mismatch without exposing Core internals.
 * It deliberately carries only the visible element name used in strict-mode diagnostics.
 */
type BaseElementLike = Pick<HTMLElement, 'localName'>;
