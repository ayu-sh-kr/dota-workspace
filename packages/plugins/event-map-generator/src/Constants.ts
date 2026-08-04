export class EventMapScanPath {
  static SOURCE_DIRECTORY_SCAN_PATH = './src/**/*.ts';
  static SOURCE_DECLARATION_IGNORE_PATTERN = '**/*.d.ts';
}

/**
 * Public lifecycle event keys owned by Dota libraries.
 * These names are registered directly because their implementations may live
 * outside configured application scan roots and do not need source resolution.
 */
export const BUILT_IN_EVENT_NAMES = [
  'constructed',
  'connected',
  'disconnected',
  'attribute-changed',
  'dom-updated',
] as const;

export class ASTFilterConstants {
  static ON_EVENT_DECORATOR_NAME = 'OnEvent';
  static APPLICATION_EVENT_NAME_PROPERTY = 'name';
  static APPLICATION_EVENT_DATA_PROPERTY = 'data';
  static PUBLISH_METHOD_NAME = 'publish';
  static PUBLISH_ASYNC_METHOD_NAME = 'publishAsync';
  static EMIT_METHOD_NAME = 'emit';
}

export class EventMapModuleConstants {
  static DEFAULT_MODULE_SPECIFIER = '@ayu-sh-kr/dota-wrap/event';
  static DEFAULT_OUTPUT_PATH = './src/event-map.d.ts';
  static DEFAULT_LOCATION_OUTPUT_PATH = './src/event-map.locations.json';
}

/** Vite-owned aliases that cannot resolve application event source imports. */
export class ViteAliasConstants {
  static INTERNAL_ALIAS_SOURCE_PREFIX = '^\\/?@vite\\/';
}
