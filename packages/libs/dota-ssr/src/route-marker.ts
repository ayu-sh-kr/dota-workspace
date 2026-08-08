/**
 * Route-marker family: gates whether the router's initial handoff may adopt a
 * server-rendered route host at all.
 *
 * This is a deliberately separate counter from `MARKER_VERSION`
 * (`@ayu-sh-kr/dota-rendering`'s template marker version, a `number`, currently `2`) —
 * not an oversight. `data-dh-route-version` versions the *route-boundary contract*
 * (which element owns the route outlet, and whether the router may leave it alone);
 * `MARKER_VERSION` versions the *template-identity contract* (whether a component's
 * serialized parts can be adopted node-for-node). A route host can be route-marker
 * v1 while its inner component template is marker v2, v3, etc. — bumping one does not
 * imply bumping the other. They are intentionally cross-linked here rather than
 * merged into one counter; see S4 in
 * `documentation/standards/audits/hydration-ssr-lifecycle-consistency-audit.md` and the
 * glossary in `documentation/standards/hydration-ssr/README.md`.
 */

/** Identifies a route host emitted by the static renderer. */
export const HYDRATION_ROUTE_ATTRIBUTE = 'data-dh-route';
/** Version-gates route adoption independently from template hydration markers (see file header). */
export const HYDRATION_ROUTE_VERSION_ATTRIBUTE = 'data-dh-route-version';
/** Marker schema version shared by prerendering and browser adoption. */
export const HYDRATION_ROUTE_VERSION = '1';
