import {
  HYDRATION_COMPONENT_ATTRIBUTE,
  HYDRATION_SCOPE_ATTRIBUTE,
  HYDRATION_TEMPLATE_ATTRIBUTE,
  HYDRATION_VERSION_ATTRIBUTE,
  MARKER_VERSION,
  templateId
} from './template-id';

/**
 * The durable hydration marker format, in one place for every emitter: the DOM renderer
 * (SSG) and Dota SSR's string serializer build their output from these, and `hydrate()`
 * parses the same shapes, so the three cannot drift apart.
 */

/** Opens the range the renderer places around every mounted template. */
export const COMPONENT_START_MARKER = '<!--dota-component-start-->';
export const COMPONENT_END_MARKER = '<!--dota-component-end-->';
/** Document-order index of an element within its own template; pairs attribute parts on adoption. */
export const NODE_INDEX_ATTRIBUTE = 'data-dota-index';
/** Tag name written on custom elements inside a template. */
export const COMPONENT_ATTRIBUTE = 'data-dota-component';
/** Written on elements that own a child or attribute part. */
export const DYNAMIC_ATTRIBUTE = 'data-dota-dynamic';
/** Host attributes {@link hydrationIdentity} writes; clear these before re-stamping a host. */
export const HYDRATION_IDENTITY_ATTRIBUTES = [HYDRATION_COMPONENT_ATTRIBUTE, HYDRATION_TEMPLATE_ATTRIBUTE, HYDRATION_VERSION_ATTRIBUTE, HYDRATION_SCOPE_ATTRIBUTE] as const;

/** Comment data that opens and closes one durable range. */
export type MarkerPair = {
  readonly start: string;
  readonly end: string;
};

/** The `n`-th marker scope of a document: `h0`, `h1`, …; `hydrate()` accepts only this shape. */
export function hydrationScope(index: number): string {
  return `h${index}`;
}

/** Whether a host's `data-dh-s` value is a scope {@link hydrationScope} could have produced. */
export function isHydrationScope(value: string | null): value is string {
  return value !== null && /^h\d+$/.test(value);
}

/** Comment data around child part `index`: `dh:<scope>:p<index>` … `/dh:<scope>:p<index>`. */
export function childPartMarkers(scope: string, index: number): MarkerPair {
  return {start: `dh:${scope}:p${index}`, end: `/dh:${scope}:p${index}`};
}

/** Comment data around a keyed entry: `dh:<scope>:k<part>:<position>` … and its `/` twin. */
export function keyedEntryMarkers(scope: string, partIndex: number, position: number): MarkerPair {
  return {start: `dh:${scope}:k${partIndex}:${position}`, end: `/dh:${scope}:k${partIndex}:${position}`};
}

/** One token of an element's `data-dh-a` list, naming the attribute part at `index`. */
export function attributePartToken(scope: string, index: number): string {
  return `${scope}:p${index}`;
}

/**
 * Host attributes that let `hydrate()` adopt a component's server DOM: its tag, the
 * identity of its template's static strings, the marker version, and its scope.
 * @param tagName Host element name.
 * @param strings Static strings of the template the host rendered.
 * @param scope Scope owning the host's part markers.
 */
export function hydrationIdentity(tagName: string, strings: TemplateStringsArray, scope: string): Record<string, string> {
  return {
    [HYDRATION_COMPONENT_ATTRIBUTE]: tagName,
    [HYDRATION_TEMPLATE_ATTRIBUTE]: templateId(strings),
    [HYDRATION_VERSION_ATTRIBUTE]: String(MARKER_VERSION),
    [HYDRATION_SCOPE_ATTRIBUTE]: scope
  };
}
