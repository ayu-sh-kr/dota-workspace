

export class ComponentScanPath {
  static SOURCE_PAGE_DIRECTORY_SCAN_PATH = "./src/pages/**/*.page.ts";
  static SOURCE_COMPONENT_DIRECTORY_SCAN_PATH = "./src/components/**/*.component.ts";
  static SOURCE_ROOT_DIRECTORY_SCAN_PATH = "./src/**/*.component.ts";
}

export class ASTFilterConstants {
  static COMPONENT_DECORATOR_NAME = 'Component';
  static CLASS_RENDER_METHOD_NAME = 'render';
  static COMPONENT_TAG_NAME_PROPERTY = 'selector';
}

export class ImportPath {
  static DOTA_CORE = "@ayu-sh-kr/dota-core";
}

export class VirtualImportID {
  static DOTA_COMPONENTS = "virtual:dota-components";
  static RESOLVED_DOTA_COMPONENTS = "\0virtual:dota-components";
}