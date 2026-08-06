import {readFile, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';
import type {DotaSsgVercelOptions, ResolvedDotaSsgRoute} from './types';

/** Generated canonical redirect appended for one non-root SSG route. */
type VercelRedirect = {
  /** Public application pathname that should resolve to its generated document. */
  source: string;
  /** Static output URL served after Vercel applies the redirect. */
  destination: string;
  /** Generated redirects are canonical and therefore permanent. */
  permanent: true;
};

/** Parsed Vercel configuration whose unrelated settings must survive SSG updates. */
type VercelConfig = {
  /** Existing redirect entries, validated as an array before generated entries are merged. */
  redirects?: unknown;
  [key: string]: unknown;
};

/** Vercel configuration file and the text already read while locating it. */
type VercelConfigSource = {
  /** Absolute file path used for parse errors and the conditional write. */
  file: string;
  /** Current JSON text used to avoid a second read and unnecessary writes. */
  text: string;
};

/** Redirect-like configuration entry whose source identifies ownership during replacement. */
type VercelRedirectSource = Pick<VercelRedirect, 'source'>;

/**
 * Adds or updates the redirects needed to expose generated directory indexes at their route paths.
 * Existing Vercel settings and unrelated redirects remain unchanged, while prior generated sources
 * are replaced so repeated builds converge without configuration churn.
 * @param root Vite root used to discover the Vercel project configuration.
 * @param routes Normalized SSG routes and their output files.
 * @param options Optional explicit Vercel configuration path.
 * @throws Error when the configuration is missing, invalid JSON, or has non-array redirects.
 */
export async function updateVercelConfig(
  root: string,
  routes: readonly ResolvedDotaSsgRoute[],
  options: DotaSsgVercelOptions = {}
): Promise<void> {
  const configSource = await readVercelConfigSource(root, options.configFile);
  const config = parseVercelConfig(configSource.text, configSource.file);
  const redirects = config.redirects === undefined ? [] : config.redirects;
  if (!Array.isArray(redirects)) {
    throw new Error(`Vercel redirects must be an array: ${configSource.file}`);
  }

  const generatedRedirects = createVercelRedirects(routes);
  const generatedSources = new Set(generatedRedirects.map(redirect => redirect.source));
  const preservedRedirects = redirects.filter(redirect => {
    if (!hasVercelRedirectSource(redirect)) return true;
    return !generatedSources.has(redirect.source);
  });
  config.redirects = [...preservedRedirects, ...generatedRedirects];

  const nextText = `${JSON.stringify(config, null, 2)}\n`;
  if (nextText !== configSource.text) {
    await writeFile(configSource.file, nextText, 'utf8');
  }
}

/**
 * Creates canonical route redirects for non-root generated documents.
 * Root output remains Vercel's default document, while directory indexes receive their trailing
 * slash destination and explicitly named HTML outputs retain their file path.
 * @param routes Validated SSG route-to-output mappings.
 * @returns Redirects owned by SSG, in the order supplied by the resolved routes.
 */
export function createVercelRedirects(routes: readonly ResolvedDotaSsgRoute[]): VercelRedirect[] {
  return routes
    .filter(route => route.path !== '/')
    .map(route => ({
      source: route.path,
      destination: outputUrl(route.output),
      permanent: true as const
    }));
}

/**
 * Finds and reads the Vercel configuration once for the caller's update transaction.
 * Explicit paths are resolved from the Vite root; otherwise ancestor directories are searched so
 * apps can use a workspace-level configuration without duplicating it beside every package.
 * @param root Vite root used as the configured-path base and discovery starting point.
 * @param configuredFile Optional absolute or root-relative configuration override.
 * @returns The resolved configuration file and its current text.
 * @throws Error when discovery reaches the filesystem root without a `vercel.json` file.
 */
async function readVercelConfigSource(root: string, configuredFile?: string): Promise<VercelConfigSource> {
  if (configuredFile) {
    const file = isAbsolute(configuredFile) ? configuredFile : resolve(root, configuredFile);
    return {file, text: await readFile(file, 'utf8')};
  }

  let directory = resolve(root);
  while (true) {
    const candidate = resolve(directory, 'vercel.json');
    try {
      return {file: candidate, text: await readFile(candidate, 'utf8')};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(`Unable to find vercel.json above Vite root: ${root}`);
}

/**
 * Parses the current Vercel configuration as a mutable JSON object.
 * Object-only validation preserves arbitrary Vercel settings while rejecting arrays and primitives
 * that cannot safely receive a `redirects` property.
 * @param text Current file contents read during configuration discovery.
 * @param configFile Absolute configuration path included in actionable parse errors.
 * @returns Parsed configuration ready for generated redirect replacement.
 * @throws Error when JSON is invalid or does not contain an object.
 */
function parseVercelConfig(text: string, configFile: string): VercelConfig {
  try {
    const config = JSON.parse(text) as unknown;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('configuration must be a JSON object');
    }
    return config as VercelConfig;
  } catch (error) {
    throw new Error(`Unable to parse ${configFile}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Identifies redirect entries that can be replaced by generated source pathname.
 * Other redirect-array values are deliberately preserved because they are user-owned configuration
 * outside SSG's narrow source-based replacement policy.
 * @param value Existing redirect-array entry.
 * @returns Whether the entry exposes a string source pathname.
 */
function hasVercelRedirectSource(value: unknown): value is VercelRedirectSource {
  return !!value && typeof value === 'object' &&
    typeof (value as {source?: unknown}).source === 'string';
}

/**
 * Converts a validated relative output file into the URL Vercel should serve.
 * Directory indexes become canonical trailing-slash paths, while custom HTML outputs remain explicit
 * so redirect destinations always identify the file written by the SSG build.
 * @param output Safe output path supplied by route resolution.
 * @returns Root, directory, or file URL suitable for a Vercel redirect destination.
 */
function outputUrl(output: string): string {
  if (output === 'index.html') return '/';
  if (output.endsWith('/index.html')) return `/${output.slice(0, -'index.html'.length)}`;
  return `/${output}`;
}
