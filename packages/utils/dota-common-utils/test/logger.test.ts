import {LogLevels, type LogObject} from 'consola';
import {afterEach, expect, it, vi} from 'vitest';
import {configureDotaLogging, createDotaLogger, DotaLogType, resolveDotaLogType} from '../src/logger';

afterEach(() => {
  configureDotaLogging({});
  vi.unstubAllEnvs();
});

it('uses the enum default and ignores unsupported environment levels', () => {
  vi.stubEnv('DOTA_LOG_TYPE', 'invalid');

  expect(resolveDotaLogType('dota-ssr')).toBe(DotaLogType.Info);
});

it('resolves plugin, package, wrapper, and global settings in order', () => {
  vi.stubEnv('DOTA_LOG_TYPE', 'warn');
  expect(resolveDotaLogType('dota-ssr')).toBe('warn');
  expect(resolveDotaLogType('dota-ssr', undefined, 'debug')).toBe('debug');
  expect(resolveDotaLogType('dota-ssr', undefined, 'debug', 'trace')).toBe('trace');

  vi.stubEnv('DOTA_SSR_LOG_TYPE', 'trace');
  expect(resolveDotaLogType('dota-ssr', undefined, 'debug')).toBe('trace');
  expect(resolveDotaLogType('dota-ssr', 'error', 'debug')).toBe('error');
});

it('updates existing loggers when wrap configures global and package levels', () => {
  const router = createDotaLogger('dota-router', 'router.ts');
  const rendering = createDotaLogger('dota-rendering', 'renderer.ts');
  const explicit = createDotaLogger('dota-router', 'explicit.ts', 'error');

  configureDotaLogging({logType: 'debug', packages: {'dota-router': 'trace'}});

  expect(router.level).toBe(LogLevels.trace);
  expect(rendering.level).toBe(LogLevels.debug);
  expect(explicit.level).toBe(LogLevels.error);
  expect(createDotaLogger('dota-router', 'new.ts').level).toBe(LogLevels.trace);
});

it('includes source, severity, and timestamp in reported records', () => {
  const logger = createDotaLogger('dota-ssr', 'ssg/generate.ts', 'debug');
  const records: LogObject[] = [];
  logger.setReporters([{log: record => records.push(record)}]);

  logger.debug('Rendered /home');

  expect(logger.level).toBe(LogLevels.debug);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({tag: 'dota-ssr:ssg/generate.ts', type: 'debug', args: ['Rendered /home']});
  expect(records[0].date).toBeInstanceOf(Date);
});

it('prints the timestamp, severity, source file, and message', () => {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createDotaLogger('dota-ssr', 'ssg/generate.ts');

  logger.info('Prerendered 2 routes');

  expect(output).toHaveBeenCalledWith(
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[dota-ssr:ssg\/generate\.ts\]$/),
    'Prerendered 2 routes'
  );
  output.mockRestore();
});
