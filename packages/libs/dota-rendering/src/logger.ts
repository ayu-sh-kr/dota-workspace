import {createConsola, LogLevels, type ConsolaInstance, type LogType} from 'consola';

let logger = createConsola({
  level: LogLevels.silent,
  formatOptions: {date: true, colors: true}
});

/**
 * Configures diagnostics for rendering work initiated by a host integration.
 * Rendering remains silent until an integration, such as the SSG Vite plugin,
 * explicitly supplies its preferred Consola level.
 * @param logType Minimum verbosity for renderer diagnostics.
 */
export function configureDotaRenderingLogger(logType: LogType): void {
  logger = createConsola({
    level: LogLevels[logType],
    formatOptions: {date: true, colors: true}
  });
}

/** Returns the renderer-scoped logger used by rendering internals. */
export function getDotaRenderingLogger(): ConsolaInstance {
  return logger;
}
