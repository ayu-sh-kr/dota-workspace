export class EventMapScanPath {
  static SOURCE_DIRECTORY_SCAN_PATH = './src/**/*.ts';
  static SOURCE_DECLARATION_IGNORE_PATTERN = '**/*.d.ts';
}

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
