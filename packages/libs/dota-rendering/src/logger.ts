import {createDotaLogger, resolveDotaLogType} from '@ayu-sh-kr/dota-common-utils';
import type {ConsolaInstance, LogType} from 'consola';

let logger = createDotaLogger('dota-rendering', 'renderer.ts');

/**
 * Configures diagnostics for rendering work initiated by a host integration.
 * An integration such as SSG supplies its own level as the rendering default;
 * `DOTA_RENDERING_LOG_TYPE` and package-specific settings still take precedence.
 * @param logType Default verbosity for renderer diagnostics.
 */
export function configureDotaRenderingLogger(logType: LogType): void {
  logger = createDotaLogger('dota-rendering', 'renderer.ts', resolveDotaLogType('dota-rendering', undefined, logType));
}

/** Returns the renderer-scoped logger used by rendering internals. */
export function getDotaRenderingLogger(): ConsolaInstance {
  return logger;
}
