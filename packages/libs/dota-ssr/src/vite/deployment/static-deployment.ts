import type {DotaSsgDeploymentOptions, ResolvedDotaSsgRoute} from '../../ssg/types';

/** What static generation prepared in one build, handed to the request-time deployment. */
export type StaticDeployment = {
  /** Pages written to the output directory; server routing must leave them static. */
  readonly routes: readonly ResolvedDotaSsgRoute[];
  /** Hosting target SSG prepared files for, or `false` when it wrote none. */
  readonly deployment: DotaSsgDeploymentOptions | false;
};

/** Global slot, so copies of this module loaded twice by a Vite config still share it. */
const STATIC_DEPLOYMENTS = Symbol.for('dota.ssr.static-deployments');

/** Static deployments of the running builds, keyed by absolute output directory. */
function staticDeployments(): Map<string, StaticDeployment> {
  const slots = globalThis as Record<symbol, Map<string, StaticDeployment> | undefined>;
  return slots[STATIC_DEPLOYMENTS] ??= new Map();
}

/**
 * Records what static generation prepared for an output directory. The SSR plugin's
 * `closeBundle` is ordered after every other plugin's, so it reads this in the same build.
 * @param outputDirectory Absolute build directory.
 * @param deployment Written pages and the hosting target used.
 */
export function recordStaticDeployment(outputDirectory: string, deployment: StaticDeployment): void {
  staticDeployments().set(outputDirectory, deployment);
}

/**
 * Returns and forgets the static deployment recorded for an output directory, so a later
 * build in the same process (watch mode, or a build without `--ssg`) never sees stale pages.
 * @param outputDirectory Absolute build directory.
 * @returns The recorded deployment, or `undefined` when static generation did not run.
 */
export function takeStaticDeployment(outputDirectory: string): StaticDeployment | undefined {
  const deployment = staticDeployments().get(outputDirectory);
  staticDeployments().delete(outputDirectory);
  return deployment;
}
