import {RouteConfig} from "@dota/Types";

/**
 * Compiles independently declared page routes into the segment hierarchy used by routers.
 * Each node stores only its own segment path, allowing nested routers to consume the
 * remaining URL one level at a time. Missing parent pages receive the error component so
 * every generated node remains renderable until an application supplies a parent route.
 * Dynamic segment syntax is retained in `path` and additionally exposed through `slug`.
 * @param flatRoutes - Full route paths and the component that owns each terminal path.
 * @param errorRoute - Application fallback whose component fills generated parent segments.
 * @returns A newly constructed route tree; source routes and their paths remain unchanged.
 */
export function configure<T extends HTMLElement>(
  flatRoutes: RouteConfig<T>[],
  errorRoute: RouteConfig<T>
): RouteConfig<T>[] {
  const routes: RouteConfig<T>[] = [];

  for (const route of flatRoutes) {
    const segments = toSegments(route.path);
    if (segments.length === 0) {
      upsert(routes, copyRoute(route, "/"));
      continue;
    }

    let siblings = routes;
    for (const [index, segment] of segments.entries()) {
      const path = `/${segment}`;
      const isLeaf = index === segments.length - 1;
      let node = siblings.find(candidate => candidate.path === path);

      if (!node) { // it's a new node to the tree
        node = isLeaf
          ? copyRoute(route, path) // if it's a leaf, then add the node to the tree
          : placeholder(path, errorRoute); // not a leaf, so adding error component future check might add a valid component later
        siblings.push(node); // add the new node to the tree
      } else if (isLeaf) {
        replaceRoute(node, route, path);
      }

      if (isSlugSegment(segment)) {
        node.slug = true;
      }

      if (!isLeaf) {
        node.children ??= [];
        siblings = node.children;
      }
    }
  }

  return routes;
}

function toSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * Identifies segments that match arbitrary URL values instead of literal text.
 * The configurer supports colon parameters and bracket parameters because generated
 * route sources may use either convention. Catch-all brackets are also dynamic,
 * but their path spelling is preserved for the route matcher to interpret.
 * @param segment - One normalized path segment without its leading slash.
 * @returns Whether the resulting route node must expose `slug: true`.
 */
function isSlugSegment(segment: string): boolean {
  return segment.startsWith(":") || /^\[\.\.\.[^\]]+\]$/.test(segment) || /^\[[^\]]+\]$/.test(segment);
}

/**
 * Creates a route for a structural parent that has no configured page of its own.
 * Reusing the error-route component keeps the tree type-safe and makes navigation
 * to an incomplete branch resolve through the application's existing fallback UI.
 * @param path - Relative segment path represented by the generated parent node.
 * @param errorRoute - Fallback route that provides the component to render.
 * @returns A renderable parent node with no children attached yet.
 */
function placeholder<T extends HTMLElement>(path: string, errorRoute: RouteConfig<T>): RouteConfig<T> {
  return {path, component: errorRoute.component};
}

/**
 * Copies terminal route settings onto the segment path stored in the tree.
 * The original route keeps its full path for callers that retain the flat config,
 * while only defined optional fields are copied to avoid adding semantic defaults.
 * @param route - Flat route whose component and optional behavior are retained.
 * @param path - Segment-local path to use in the compiled tree.
 * @returns A detached route node that can be safely added to the output tree.
 */
function copyRoute<T extends HTMLElement>(route: RouteConfig<T>, path: string): RouteConfig<T> {
  const configuredRoute: RouteConfig<T> = {
    path,
    component: route.component
  };
  if (route.ssr) configuredRoute.ssr = true;
  if (route.default != null) configuredRoute.default = route.default;
  if (route.slug != null) configuredRoute.slug = route.slug;
  if (route.render != null) configuredRoute.render = route.render;
  if (route.beforeEnter != null) configuredRoute.beforeEnter = route.beforeEnter;
  if (route.beforeLeave != null) configuredRoute.beforeLeave = route.beforeLeave;
  if (route.afterEnter != null) configuredRoute.afterEnter = route.afterEnter;
  if (route.afterLeave != null) configuredRoute.afterLeave = route.afterLeave;
  if (route.children != null) configuredRoute.children = route.children;
  return configuredRoute;
}

/**
 * Applies a configured parent route after descendants have already created its node.
 * Route order must not decide whether children survive, so the existing child array
 * is retained while the page-level component, flags, renderer, and declared lifecycle
 * hooks are replaced by the explicit route configuration.
 * @param target - Existing output node, potentially containing generated descendants.
 * @param source - Flat route that now owns the node's segment.
 * @param path - Segment-local path that must remain stable in the output tree.
 */
function replaceRoute<T extends HTMLElement>(target: RouteConfig<T>, source: RouteConfig<T>, path: string): void {
  const children = target.children;
  const configuredRoute = copyRoute(source, path);
  target.path = configuredRoute.path;
  target.component = configuredRoute.component;
  delete target.ssr;
  delete target.default;
  delete target.slug;
  delete target.render;
  delete target.beforeEnter;
  delete target.beforeLeave;
  delete target.afterEnter;
  delete target.afterLeave;
  if (configuredRoute.ssr) target.ssr = true;
  if (configuredRoute.default != null) target.default = configuredRoute.default;
  if (configuredRoute.slug != null) target.slug = configuredRoute.slug;
  if (configuredRoute.render != null) target.render = configuredRoute.render;
  if (configuredRoute.beforeEnter != null) target.beforeEnter = configuredRoute.beforeEnter;
  if (configuredRoute.beforeLeave != null) target.beforeLeave = configuredRoute.beforeLeave;
  if (configuredRoute.afterEnter != null) target.afterEnter = configuredRoute.afterEnter;
  if (configuredRoute.afterLeave != null) target.afterLeave = configuredRoute.afterLeave;
  if (children) {
    target.children = children;
  } else if (configuredRoute.children) {
    target.children = configuredRoute.children;
  }
}

/**
 * Inserts a root route or merges it with a previously generated root segment.
 * Root paths have no segment traversal but still follow the same replacement rule
 * as nested parents, so duplicate route declarations do not discard existing children.
 * @param routes - Top-level output nodes currently being assembled.
 * @param route - Normalized root route to insert or merge.
 */
function upsert<T extends HTMLElement>(routes: RouteConfig<T>[], route: RouteConfig<T>): void {
  const existing = routes.find(candidate => candidate.path === route.path);
  if (existing) {
    replaceRoute(existing, route, route.path);
    return;
  }
  routes.push(route);
}
