import type {LogType} from "consola";

export type WebTypeJsonPluginConfig = {
  root?: string;
  outFile?: string;
  logType?: LogType;
  scanRoots?: string[];
}

export type WebTypesSource = {
  file: string;
  offset?: number;
};

export type PropertyInfo = {
  name: string;
  type: string;
  description?: string;
  default?: string;
  required?: boolean;
  source?: WebTypesSource;
}

export type WebComponentInfo = {
  className: string;
  tagName: string;
  source?: WebTypesSource;
  properties: PropertyInfo[];
}

export type WebTypesAttribute = {
  name: string;
  type?: string;
  description?: string;
  default?: string;
  required?: boolean;
  source?: WebTypesSource;
};

export type WebTypesElement = {
  name: string;
  description?: string;
  source?: WebTypesSource;
  attributes: WebTypesAttribute[];
};

export type WebTypesSchema = {
  $schema: string;
  name: string;
  version: string;
  contributions: {
    html: {
      elements: WebTypesElement[];
    };
  };
};

export type PackageJsonWithWebTypes = {
  name?: string;
  version?: string;
  private?: boolean;
  [key: string]: unknown;
  "web-types"?: string;
};
