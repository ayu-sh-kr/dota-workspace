import {createConsola, LogLevels, type ConsolaInstance, type ConsolaReporter, type LogType} from 'consola';

/** Supported default levels for package diagnostics. Plugin options also accept Consola's other log types. */
export enum DotaLogType {
  Silent = 'silent',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace'
}

const reporter: ConsolaReporter = {
  log(record) {
    const prefix = `${record.date.toISOString()} [${record.type.toUpperCase()}] [${record.tag}]`;
    const output = record.type === 'fatal' || record.type === 'error' || record.type === 'fail'
      ? console.error
      : record.type === 'warn' ? console.warn : console.log;
    output(prefix, ...record.args);
  }
};

/** Shared runtime settings used by loggers created before or after application initialization. */
export type DotaLoggingOptions = {
  /** Default for all Dota packages, unless a package setting or environment variable wins. */
  logType?: LogType;
  /** Overrides keyed by package slug, such as `dota-router` or `dota-ssr`. */
  packages?: Record<string, LogType>;
};

type LoggerEntry = {packageName: string; override?: LogType; logger: WeakRef<ConsolaInstance>};
type LoggingState = {settings: DotaLoggingOptions; entries: Set<LoggerEntry>};
const stateKey = Symbol.for('@ayu-sh-kr/dota-common-utils/logging');
const globalState = globalThis as unknown as Record<symbol, LoggingState | undefined>;
const state = globalState[stateKey] ??= {settings: {}, entries: new Set<LoggerEntry>()};

/**
 * Resolves logging in order: plugin setting, package environment, wrapper setting, global environment, default.
 * An unrecognized environment value is ignored so it cannot accidentally suppress diagnostics.
 * @param packageName Package slug without the @ayu-sh-kr scope.
 * @param override Explicit setting from a plugin or host integration.
 * @param globalOverride Setting supplied by the wrapper for all plugins.
 * @param packageOverride Package setting supplied by the wrapper.
 * @returns The selected Consola log type.
 */
export function resolveDotaLogType(packageName: string, override?: LogType, globalOverride?: LogType, packageOverride?: LogType): LogType {
  const environment = (globalThis as {process?: {env?: Record<string, string | undefined>}}).process?.env;
  const packageKey = `DOTA_${packageName.replace(/^dota-/, '').replace(/-/g, '_').toUpperCase()}_LOG_TYPE`;
  for (const candidate of [override, environment?.[packageKey], packageOverride ?? state.settings.packages?.[packageName], globalOverride ?? state.settings.logType, environment?.DOTA_LOG_TYPE]) {
    if (candidate && Object.hasOwn(LogLevels, candidate)) return candidate as LogType;
  }
  return DotaLogType.Info;
}

/**
 * Applies wrap's runtime logging preferences to existing and future package loggers.
 * Package environment variables still take precedence, and explicit logger overrides remain highest.
 * @param settings Global level and optional package-specific levels.
 */
export function configureDotaLogging(settings: DotaLoggingOptions): void {
  state.settings = settings;
  for (const entry of state.entries) {
    const logger = entry.logger.deref();
    if (logger) logger.level = LogLevels[resolveDotaLogType(entry.packageName, entry.override)];
    else state.entries.delete(entry);
  }
}

/**
 * Creates a package logger with a stable source tag, timestamp, and Consola severity.
 * @param packageName Package slug used for its environment variable and output tag.
 * @param sourceFile Source file or subsystem that produced the diagnostic.
 * @param override Explicit plugin or wrapper level, if supplied.
 */
export function createDotaLogger(packageName: string, sourceFile: string, override?: LogType): ConsolaInstance {
  const logger = createConsola({
    level: LogLevels[resolveDotaLogType(packageName, override)],
    formatOptions: {date: true, colors: true},
    reporters: [reporter]
  }).withTag(`${packageName}:${sourceFile}`);
  state.entries.add({packageName, override, logger: new WeakRef(logger)});
  return logger;
}
