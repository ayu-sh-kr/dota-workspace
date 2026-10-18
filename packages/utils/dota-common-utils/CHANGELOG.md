# @ayu-sh-kr/dota-common-utils

## 0.1.0

### Minor Changes

- ba59a15: Package diagnostics now use Consola with ISO timestamps, severity, and package/source-file tags. Logging defaults to `info`; set `DOTA_LOG_TYPE` globally or `DOTA_<PACKAGE>_LOG_TYPE` for one package (for example, `DOTA_SSR_LOG_TYPE=debug`). Explicit plugin `logType` settings take precedence.

  The `dotaVitePlugins` wrapper accepts a shared `logType`, per-plugin overrides, and `packageLogTypes` for preloader, event-map generation, Web Types, SSG, and SSR. `initializeApp({logging: {logType, packages}})` can also set runtime levels for all packages or individual packages. Package environment settings take precedence over shared wrap settings. The Node SSR server logs the URL it listens on, such as `http://localhost:3000`. Routine SSR and SSG timing details now appear at `debug` while `info` stays concise. During SSG, rendering diagnostics follow the SSG level unless `DOTA_RENDERING_LOG_TYPE` or a `dota-rendering` package setting overrides it.
