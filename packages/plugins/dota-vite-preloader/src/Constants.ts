

export class ComponentScanPath {
  static SOURCE_PAGE_DIRECTORY_SCAN_PATH = "./src/pages/**/*.page.ts";
  static SOURCE_COMPONENT_DIRECTORY_SCAN_PATH = "./src/components/**/*.component.ts";
  static SOURCE_ROOT_DIRECTORY_SCAN_PATH = "./src/**/*.component.ts";
}

export class ASTFilterConstants {
  static COMPONENT_DECORATOR_NAME = 'Component';
  static ROUTE_DECORATOR_NAME = 'Route';
  static CLASS_RENDER_METHOD_NAME = 'render';
  static COMPONENT_TAG_NAME_PROPERTY = 'selector';
  static ROUTE_PATH_NAME_PROPERTY = 'path';
  static ROUTE_DEFAULT_NAME_PROPERTY = 'default';
  static ROUTE_RENDER_NAME_PROPERTY = 'render';
}

export class ImportPath {
  static DOTA_CORE = "@ayu-sh-kr/dota-core";
}

export class VirtualImportID {
  static DOTA_COMPONENTS = "virtual:dota-components";
  static RESOLVED_DOTA_COMPONENTS = "\0virtual:dota-components";
  static DOTA_ROUTES = "virtual:dota-routes";
  static RESOLVED_DOTA_ROUTES = "\0virtual:dota-routes";
}
