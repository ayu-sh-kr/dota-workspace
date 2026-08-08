import {HelperUtils, type ComponentConfig} from '@ayu-sh-kr/dota-core';
import {
  HYDRATION_COMPONENT_ATTRIBUTE,
  HYDRATION_SCOPE_ATTRIBUTE,
  HYDRATION_TEMPLATE_ATTRIBUTE,
  HYDRATION_VERSION_ATTRIBUTE,
  type HydrationMismatchPolicy as RenderingHydrationMismatchPolicy,
  type RenderOutput,
  MARKER_VERSION,
  hydrate,
  deferRender,
  isTemplateResult,
  render as mountRender,
  templateId,
  warnHydrationMismatch
} from '@ayu-sh-kr/dota-rendering';
import type {
  DotaRuntimePlugin,
  DotaRuntimeContext
} from '@ayu-sh-kr/dota-runtime';
import {updateDocumentSEO} from '@ayu-sh-kr/dota-core';
import type {ComponentClass, NavigationContext, RouteMatch, RouteRenderer} from '@ayu-sh-kr/dota-router';
export {
  HYDRATION_ROUTE_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION
} from './route-marker';
import {
  HYDRATION_ROUTE_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION
} from './route-marker';

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
 * Records the server-owned route boundary across root upgrade and initial routing.
 * The lifecycle state prevents later navigations from treating stale static DOM as
 * authoritative after the one startup handoff has completed.
 */
type InitialRouteHandoff = {
  /** Root host that owns the server-rendered route outlet. */
  root: HTMLElement;
  /** Page host retained until the router completes its initial transition. */
  page: HTMLElement;
  /** Normalized server path used to reject a client route mismatch. */
  pathname: string;
  /** One-way startup ownership state shared by Core mounting and routing. */
  state: 'captured' | 'adopted' | 'released' | 'invalid';
};

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
      let handoff: InitialRouteHandoff | undefined;
      installMountStrategy(context, mismatch, () => handoff);
      context.wrapRouteRenderer((next, root) => {
        handoff = captureInitialRoute(root);
        return createHydrationRouteRenderer(next, root, handoff);
      });
    }
  };
}

/**
 * Installs marker validation at Core's exclusive initial-mount boundary.
 * Missing markers preserve normal client rendering; present but invalid markers follow the
 * configured policy so stale static HTML is never adopted under a mismatched template identity.
 * @param context Runtime sockets supplied by Dota Wrap.
 * @param mismatch Policy selected for invalid identity, version, or part markers.
 * @param getHandoff Reads the route boundary captured before custom-element upgrade.
 */
function installMountStrategy(
  context: DotaRuntimeContext,
  mismatch: HydrationMismatchPolicy,
  getHandoff: () => InitialRouteHandoff | undefined
): void {
  context.setMountStrategy((host, root, output) => {
    const handoff = getHandoff();
    if (handoff?.state === 'captured' && (host === handoff.root || host === handoff.page)) {
      if (handoff.page.isConnected && handoff.page.parentElement === handoff.root) {
        return deferRender(output, (nextOutput: RenderOutput) => mountRender(root, nextOutput));
      }
      handoff.state = 'invalid';
    }

    const serverTemplateId = host.getAttribute(HYDRATION_TEMPLATE_ATTRIBUTE);
    const serverVersion = host.getAttribute(HYDRATION_VERSION_ATTRIBUTE);
    const serverScope = host.getAttribute(HYDRATION_SCOPE_ATTRIBUTE);
    if (serverTemplateId === null && serverVersion === null) return mountRender(root, output);

    const canHydrate = isTemplateResult(output) &&
      serverTemplateId === templateId(output.strings) &&
      serverVersion === String(MARKER_VERSION) &&
      serverScope !== null;
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
    host.removeAttribute(HYDRATION_SCOPE_ATTRIBUTE);
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
  root: ComponentClass,
  handoff?: InitialRouteHandoff
): RouteRenderer<HTMLElement> {
  return (match, context) => {
    if (context.initial && handoff && handoff.state === 'captured' && rootHasMarkedPage(root, match, context, handoff)) {
      if (match.route.seo) updateDocumentSEO(match.route.seo);
      handoff.state = 'adopted';
      return;
    }
    if (context.initial && handoff?.state === 'captured') handoff.state = 'invalid';
    if (!context.initial && handoff?.state === 'captured') handoff.state = 'released';
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
  context: NavigationContext<HTMLElement>,
  handoff?: InitialRouteHandoff
): boolean {
  if (match.route.render) return false;
  const rootConfig = HelperUtils.getComponentMetadata(root, 'Component') as ComponentConfig | undefined;
  const pageConfig = HelperUtils.getComponentMetadata(match.route.component, 'Component') as ComponentConfig | undefined;
  if (!rootConfig?.selector || !pageConfig?.selector) return false;

  const rootElement = handoff?.root ?? document.getElementById(rootConfig.selector);
  const page = rootElement?.querySelector(pageConfig.selector) as HTMLElement | null;
  if (!page || page !== handoff?.page || page.parentElement !== rootElement) return false;

  const hasRouteMarker = page.getAttribute(HYDRATION_ROUTE_ATTRIBUTE) === 'true' &&
    page.getAttribute(HYDRATION_ROUTE_VERSION_ATTRIBUTE) === HYDRATION_ROUTE_VERSION;
  const hasLegacyTemplateMarker = page.getAttribute(HYDRATION_TEMPLATE_ATTRIBUTE) !== null;
  return (hasRouteMarker || hasLegacyTemplateMarker) &&
    normalizePath(page.getAttribute('path')) === normalizePath(context.url.pathname) &&
    normalizePath(handoff.pathname) === normalizePath(match.pathname);
}

/**
 * Captures the existing route host before custom-element registration can mount the root.
 * Legacy template markers remain accepted so already-generated pages retain compatibility;
 * new static output may use the route marker for string-rendered pages as well.
 * @param root Root component whose host owns the route boundary.
 * @returns A startup handoff when the current document contains an eligible route host.
 */
function captureInitialRoute(root: ComponentClass): InitialRouteHandoff | undefined {
  const rootConfig = HelperUtils.getComponentMetadata(root, 'Component') as ComponentConfig | undefined;
  if (!rootConfig?.selector) return undefined;

  const rootElement = document.getElementById(rootConfig.selector) ?? document.querySelector(rootConfig.selector);
  if (!(rootElement instanceof HTMLElement)) return undefined;

  const page = Array.from(rootElement.children).find((child): child is HTMLElement => {
    const element = child as HTMLElement;
    const hasRouteMarker = element.getAttribute(HYDRATION_ROUTE_ATTRIBUTE) === 'true' &&
      element.getAttribute(HYDRATION_ROUTE_VERSION_ATTRIBUTE) === HYDRATION_ROUTE_VERSION;
    return element.hasAttribute('path') && (hasRouteMarker || element.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE));
  });
  const pathname = normalizePath(page?.getAttribute('path'));
  if (!page || !pathname) return undefined;

  return {
    root: rootElement,
    page,
    pathname,
    state: 'captured'
  };
}

/** Normalizes route identity so trailing slashes do not create a second startup route. */
function normalizePath(path: string | null | undefined): string {
  if (!path) return '';
  const normalized = path.replace(/\/+$/, '');
  return normalized || '/';
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
