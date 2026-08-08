/**
 * Version of the durable marker format understood by the renderer and hydration plugin.
 * Versions the *template-identity contract* — whether a component's serialized parts
 * can be adopted node-for-node — independently from `@ayu-sh-kr/dota-ssr`'s
 * `HYDRATION_ROUTE_VERSION` (`data-dh-route-version`), which versions the separate
 * *route-boundary contract*. The two counters are intentionally not unified; see S4 in
 * `documentation/standards/audits/hydration-ssr-lifecycle-consistency-audit.md`.
 */
export const MARKER_VERSION = 2;

/** Attribute carrying the content-derived template identity on a rendered component host. */
export const HYDRATION_TEMPLATE_ATTRIBUTE = 'data-dh-t';

/** Attribute carrying the durable marker format version on a rendered component host. */
export const HYDRATION_VERSION_ATTRIBUTE = 'data-dh-v';

/** Attribute identifying component hosts emitted during static rendering. */
export const HYDRATION_COMPONENT_ATTRIBUTE = 'data-dh-c';

/** Attribute carrying the unique durable marker scope owned by a component host. */
export const HYDRATION_SCOPE_ATTRIBUTE = 'data-dh-s';

/** Attribute listing dynamic attribute-part indexes owned by an element. */
export const HYDRATION_ATTRIBUTE_PART = 'data-dh-a';

const IDS_BY_STRINGS = new WeakMap<TemplateStringsArray, string>();

/**
 * Creates a realm-independent identity for one template's static structure.
 * Length-prefixed segments preserve interpolation boundaries, while identity caching
 * avoids repeating the hash for stable tagged-template call sites.
 * @param strings Static segments from a normalized template result.
 * @returns Base-36 FNV-1a hash shared by build and browser runtimes.
 */
export function templateId(strings: TemplateStringsArray): string {
  const cached = IDS_BY_STRINGS.get(strings);
  if (cached) return cached;

  let hash = 0x811c9dc5;
  for (const segment of strings) {
    for (let shift = 0; shift < 32; shift += 8) {
      hash ^= (segment.length >>> shift) & 0xff;
      hash = Math.imul(hash, 0x01000193);
    }
    for (let index = 0; index < segment.length; index += 1) {
      hash ^= segment.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }

  const id = (hash >>> 0).toString(36);
  IDS_BY_STRINGS.set(strings, id);
  return id;
}
