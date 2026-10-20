import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {getIconData, iconToHTML, iconToSVG} from '@iconify/utils';

/** Icon set JSON as `@iconify/utils` reads it. */
type IconifyJSON = Parameters<typeof getIconData>[0];

/** Collections installed as `@iconify-json/*` packages; their icons build without network access. */
export const LOCAL_COLLECTIONS = [
  'mdi',
  'ic',
  'material-symbols',
  'material-symbols-light',
  'solar',
  'healthicons',
  'gridicons',
  'emojione-monotone',
  'lucide',
] as const;

const require = createRequire(import.meta.url);

/**
 * Renders icons from the installed Iconify sets, so builds and dev never depend on
 * `api.iconify.design` (which rate limits builds) for the collections the site uses.
 */
export class LocalIconSets {
  private readonly sets = new Map<string, Promise<IconifyJSON | null>>();

  /**
   * @param name Iconify name such as `mdi:github`.
   * @returns The icon as a standalone SVG matching the Iconify API output, or null when the
   *   collection is not installed or has no such icon.
   */
  async get(name: string): Promise<string | null> {
    const [prefix, icon] = name.split(':');
    if (!prefix || !icon) return null;
    const set = await this.load(prefix);
    const data = set && getIconData(set, icon);
    if (!data) return null;
    const {attributes, body} = iconToSVG(data, {height: '1em'});
    return iconToHTML(body, attributes);
  }

  private load(prefix: string): Promise<IconifyJSON | null> {
    if (!(LOCAL_COLLECTIONS as readonly string[]).includes(prefix)) return Promise.resolve(null);
    let set = this.sets.get(prefix);
    if (!set) {
      set = readFile(require.resolve(`@iconify-json/${prefix}/icons.json`), 'utf8')
        .then(text => JSON.parse(text) as IconifyJSON)
        .catch(() => null);
      this.sets.set(prefix, set);
    }
    return set;
  }
}
