import {LogLevels} from 'consola';
import {afterEach, expect, it, vi} from 'vitest';
import {configureDotaRenderingLogger, getDotaRenderingLogger} from '../src/logger';

afterEach(() => {
  vi.unstubAllEnvs();
});

it('uses the integration level as the rendering default', () => {
  configureDotaRenderingLogger('debug');

  expect(getDotaRenderingLogger().level).toBe(LogLevels.debug);
});

it('lets DOTA_RENDERING_LOG_TYPE override the integration level', () => {
  vi.stubEnv('DOTA_RENDERING_LOG_TYPE', 'warn');

  configureDotaRenderingLogger('debug');

  expect(getDotaRenderingLogger().level).toBe(LogLevels.warn);
});
