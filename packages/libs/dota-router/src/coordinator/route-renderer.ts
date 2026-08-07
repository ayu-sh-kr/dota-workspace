import {HelperUtils, ComponentConfig, updateDocumentSEO} from "@ayu-sh-kr/dota-core";
import {ComponentClass, NavigationContext, RouteMatch, RouteRenderer} from "@dota/Types";

/**
 * Creates the DOM presentation callback consumed by either browser coordinator.
 * The root is captured once so coordinators only provide route and transition data;
 * custom route renderers remain supported before component metadata is mounted.
 * @param root - Root component whose host receives the selected route element.
 * @returns A coordinator-compatible renderer that updates the root element.
 */
export function createRouteRenderer<T extends HTMLElement = HTMLElement>(root: ComponentClass): RouteRenderer<T> {
  return (match, context) => renderRoute(root, match, context);
}

/**
 * Mounts a resolved route into the application's root host.
 * It synchronizes declared route SEO first, so default and custom renderers observe
 * the active document head. Missing root or component metadata leaves existing DOM
 * intact, keeping rendering failures observable without making transitions throw.
 * @param root - Root component whose decorated selector identifies the host element.
 * @param match - Resolved route and match state supplied by a coordinator.
 * @param context - Transition context carrying the destination URL for custom renderers.
 */
export function renderRoute<T extends HTMLElement>(
  root: ComponentClass,
  match: RouteMatch<T>,
  context: NavigationContext<T>
): void {
  const route = match.route;
  if (route.seo) updateDocumentSEO(route.seo);

  const rootConfig = getComponentConfig(root);
  if (!rootConfig?.selector) {
    console.error("Root component metadata not found");
    return;
  }

  const rootElement = document.querySelector(`#${rootConfig.selector}`);
  if (!rootElement) {
    console.error(`Root element not found for selector: ${rootConfig.selector}`);
    return;
  }

  if (route.render) {
    route.render(context.url.pathname);
    return;
  }

  const componentConfig = getComponentConfig(route.component);
  if (!componentConfig?.selector) {
    console.error(`Component metadata not found for path: ${match.pathname}`);
    return;
  }

  const message = match.matched ? "" : ` message="Path not found"`;
  rootElement.innerHTML = `<${componentConfig.selector}${message} path="${match.pathname}"></${componentConfig.selector}>`;
}

function getComponentConfig(component: ComponentClass): ComponentConfig | undefined {
  return HelperUtils.getComponentMetadata(component, "Component") as ComponentConfig | undefined;
}
