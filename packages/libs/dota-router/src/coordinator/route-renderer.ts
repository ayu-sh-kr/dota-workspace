import {HelperUtils, ComponentConfig, updateDocumentSEO} from "@ayu-sh-kr/dota-core";
import {ComponentClass, NavigationContext, RouteMatch, RouteRenderer} from "@dota/Types";

/**
 * Marker attributes a hydration-aware layer (`dota-ssr`) stamps onto server-rendered
 * route and template output. Duplicated here as literals rather than imported, since
 * `dota-router` has no dependency on `dota-ssr`/`dota-rendering` and must stay usable
 * standalone; kept in sync manually with `HYDRATION_ROUTE_ATTRIBUTE` and
 * `HYDRATION_TEMPLATE_ATTRIBUTE`.
 */
const HYDRATION_MARKER_ATTRIBUTES = ["data-dh-route", "data-dh-t"] as const;

/** Detects a still-present server-rendered child so a silent overwrite can be logged. */
function hasMarkedServerOutput(root: Element): boolean {
  return Array.from(root.children).some(child =>
    HYDRATION_MARKER_ATTRIBUTES.some(attribute => child.hasAttribute(attribute))
  );
}

/**
 * Selects how a render-time configuration failure (missing root/component metadata)
 * is reported. Mirrors the `warn` | `throw` shape used by `dota-ssr`'s hydration
 * mismatch policy so the same two failure-handling contracts read the same way across
 * packages, even though `dota-router` cannot import that type directly.
 */
export type RouteRenderErrorPolicy = 'warn' | 'throw';

/** Options accepted by `createRouteRenderer` / `renderRoute`. */
export type RouteRendererOptions = {
  /** `warn` logs and leaves existing DOM intact (default); `throw` surfaces the failure to the caller. */
  onError?: RouteRenderErrorPolicy;
};

/**
 * Reports a render-time configuration failure per the selected policy.
 * @param message Failure description, consistent with the prior `console.error` wording.
 * @param policy `warn` (default) logs only; `throw` raises so the transition surfaces it.
 */
function reportRenderError(message: string, policy: RouteRenderErrorPolicy): void {
  if (policy === 'throw') throw new Error(message);
  console.error(message);
}

/**
 * Creates the DOM presentation callback consumed by either browser coordinator.
 * The root is captured once so coordinators only provide route and transition data;
 * custom route renderers remain supported before component metadata is mounted.
 * @param root - Root component whose host receives the selected route element.
 * @param options - Failure-handling policy for missing root/component metadata; defaults to `warn`.
 * @returns A coordinator-compatible renderer that updates the root element.
 */
export function createRouteRenderer<T extends HTMLElement = HTMLElement>(
  root: ComponentClass,
  options?: RouteRendererOptions
): RouteRenderer<T> {
  return (match, context) => renderRoute(root, match, context, options);
}

/**
 * Mounts a resolved route into the application's root host.
 * It synchronizes declared route SEO first, so default and custom renderers observe
 * the active document head. Missing root or component metadata is reported per
 * `options.onError` (`warn` by default, leaving existing DOM intact and rendering
 * failures observable without making transitions throw).
 * @param root - Root component whose decorated selector identifies the host element.
 * @param match - Resolved route and match state supplied by a coordinator.
 * @param context - Transition context carrying the destination URL for custom renderers.
 * @param options - Failure-handling policy for missing root/component metadata; defaults to `warn`.
 */
export function renderRoute<T extends HTMLElement>(
  root: ComponentClass,
  match: RouteMatch<T>,
  context: NavigationContext<T>,
  options?: RouteRendererOptions
): void {
  const policy: RouteRenderErrorPolicy = options?.onError ?? 'warn';
  const route = match.route;
  if (route.seo) updateDocumentSEO(route.seo);

  const rootConfig = getComponentConfig(root);
  if (!rootConfig?.selector) {
    reportRenderError("Root component metadata not found", policy);
    return;
  }

  const rootElement = document.querySelector(`#${rootConfig.selector}`);
  if (!rootElement) {
    reportRenderError(`Root element not found for selector: ${rootConfig.selector}`, policy);
    return;
  }

  if (route.render) {
    route.render(context.url.pathname);
    return;
  }

  const componentConfig = getComponentConfig(route.component);
  if (!componentConfig?.selector) {
    reportRenderError(`Component metadata not found for path: ${match.pathname}`, policy);
    return;
  }

  if (context.initial && hasMarkedServerOutput(rootElement)) {
    console.warn(
      `[dota-router] Discarding server-rendered output in #${rootConfig.selector} on the initial render. ` +
      "dota-router does not preserve hydration markers on its own — wrap this app with dota-wrap's " +
      "initializeApp() and the dotaHydration() plugin, or prerendered HTML will always be dropped on first load."
    );
  }

  const message = match.matched ? "" : ` message="Path not found"`;
  rootElement.innerHTML = `<${componentConfig.selector}${message} path="${match.pathname}"></${componentConfig.selector}>`;
}

function getComponentConfig(component: ComponentClass): ComponentConfig | undefined {
  return HelperUtils.getComponentMetadata(component, "Component") as ComponentConfig | undefined;
}
