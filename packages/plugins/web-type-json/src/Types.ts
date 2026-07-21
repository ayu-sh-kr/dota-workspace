import type {LogType} from "consola";
import type {ClassDeclaration} from "@swc/core";

/**
 * Configures the plugin's optional Custom Elements Manifest output.
 * It keeps CEM-specific choices separate from the main plugin contract and is
 * normalized before either the build or watcher generation path runs.
 */
export type CustomElementsManifestConfig = {
  /** Enables CEM generation. Object configuration remains disabled until explicitly enabled. */
  enabled?: boolean;
  /** Output path relative to the package root. Defaults to `custom-elements.json`. */
  outFile?: string;
  /** Registers `package.json.customElements`. Defaults to `true` when generation is enabled. */
  updatePackageJson?: boolean;
  /** Maps an absolute TypeScript source file to its published JavaScript module path. */
  modulePath?: (sourceFile: string, root: string) => string;
};

/**
 * Carries resolved CEM settings into the coordinated artifact writer.
 * It removes shorthand and default handling from build and watcher flows after
 * `CustomElementsManifestUtils` has normalized the public configuration.
 */
export type NormalizedCustomElementsManifestConfig = {
  enabled: boolean;
  outFile: string;
  updatePackageJson: boolean;
  modulePath?: CustomElementsManifestConfig["modulePath"];
};

/**
 * Defines the public configuration accepted by the Vite plugin factory.
 * Its paths and logging choices control source scanning and artifact generation
 * during both `buildStart` and development watcher refreshes.
 */
export type WebTypeJsonPluginConfig = {
  /** Package root used to resolve outputs and the default scan root. */
  root?: string;
  /** Web Types output path relative to `root`; defaults to `web-types.json`. */
  outFile?: string;
  /** Minimum plugin log level; defaults to `info`. */
  logType?: LogType;
  /** Roots included in the shared scan, including external component packages. */
  scanRoots?: string[];
  /** Opts into Custom Elements Manifest generation without changing Web Types defaults. */
  customElementsManifest?: boolean | CustomElementsManifestConfig;
};

/**
 * Links generated metadata to its declaration in a TypeScript source file.
 * The scanner creates this reference and Web Types projections retain it so IDEs
 * can navigate from elements and properties back to source.
 */
export type WebTypesSource = {
  file: string;
  /** Parser-corrected declaration offset expected by the Web Types source reference. */
  offset?: number;
};

/**
 * Captures one decorated component property in the shared scan model.
 * It preserves both HTML attribute and JavaScript field identities so Web Types
 * and CEM serializers can project accurate metadata from the same scan.
 */
export type PropertyInfo = {
  /** HTML attribute name retained for backward compatibility. */
  name: string;
  /** JavaScript class-field name; defaults to `name` for legacy scan records. */
  propertyName?: string;
  /** Decorator or inferred TypeScript type before output-specific normalization. */
  type: string;
  description?: string;
  /** Stable string representation of a configured or simple initializer default. */
  default?: string;
  required?: boolean;
  source?: WebTypesSource;
};

/**
 * Carries normalized component metadata shared by each output serializer.
 * It prevents Web Types and CEM generation from rescanning source files and is
 * produced by the scanner before either schema builder runs.
 */
export type WebComponentInfo = {
  className: string;
  tagName: string;
  description?: string;
  /** Whether the class is exported directly or through a local named export. */
  exported?: boolean;
  /** Public JavaScript export name, including a local named-export alias when present. */
  exportName?: string;
  /** Absolute source path used to enforce package ownership for CEM modules. */
  sourceFile?: string;
  superclass?: string;
  source?: WebTypesSource;
  properties: PropertyInfo[];
};

/**
 * Pairs a component-decorated AST class with its resolved export information.
 * The scanner needs this intermediate contract while merging direct and named
 * exports, before flattening each class into `WebComponentInfo`.
 */
export type ComponentClassScanCandidate = {
  declaration: ClassDeclaration;
  exported: boolean;
  exportName?: string;
};

/**
 * Supplies package context when projecting shared scan data into a CEM document.
 * `createCustomElementsManifest` uses it to exclude external sources and map owned
 * TypeScript files to their published JavaScript modules.
 */
export type CustomElementsManifestGenerationOptions = {
  root: string;
  modulePath?: CustomElementsManifestConfig["modulePath"];
};

/**
 * Groups the inputs accepted by the public Web Types artifact writer.
 * It lets callers write a previously collected scan without entering the Vite
 * plugin lifecycle or performing another source scan.
 */
export type WebTypesArtifactsWriteOptions = {
  root: string;
  outFile: string;
  scannedWebComponentInfos: WebComponentInfo[];
};

/**
 * Extends Web Types writer inputs with normalized optional CEM settings.
 * The internal coordinated writer uses this contract to emit enabled artifacts
 * in parallel and update package discovery fields once.
 */
export type GeneratedArtifactsWriteOptions = WebTypesArtifactsWriteOptions & {
  customElementsManifest?: NormalizedCustomElementsManifestConfig;
};

/**
 * Represents an HTML attribute contribution in the generated Web Types document.
 * `createWebTypesSchema` projects it from `PropertyInfo` so markup completion can
 * expose the property's type, documentation, default, and source navigation.
 */
export type WebTypesAttribute = {
  name: string;
  description?: string;
  default?: string;
  required?: boolean;
  value?: {
    type: string;
  };
  source?: WebTypesSource;
};

/**
 * Represents a JavaScript property contribution attached to a Web Types element.
 * It keeps class-field completion accurate when a decorator exposes a different
 * HTML attribute name for the same component property.
 */
export type WebTypesJavaScriptProperty = {
  name: string;
  type?: string;
  description?: string;
  default?: string;
  source?: WebTypesSource;
};

/**
 * Describes one custom element in the Web Types HTML contribution model.
 * The Web Types serializer builds it from `WebComponentInfo`, combining markup
 * attributes with their corresponding JavaScript properties.
 */
export type WebTypesElement = {
  name: string;
  description?: string;
  source?: WebTypesSource;
  attributes: WebTypesAttribute[];
  js?: {
    properties: WebTypesJavaScriptProperty[];
  };
};

/**
 * Models the complete JetBrains Web Types artifact emitted by the plugin.
 * `createWebTypesSchema` returns this contract and the artifact writer serializes
 * it to the configured Web Types JSON file.
 */
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

/**
 * Wraps type text in the structure required by the CEM schema.
 * The CEM serializer uses it for both class fields and their linked attributes.
 */
export type CustomElementsManifestType = {
  text: string;
};

/**
 * Describes a component class field in a CEM declaration.
 * It is projected from `PropertyInfo` so CEM consumers can relate the JavaScript
 * member to its public HTML attribute.
 */
export type CustomElementsManifestField = {
  kind: "field";
  name: string;
  attribute?: string;
  description?: string;
  type?: CustomElementsManifestType;
  default?: string;
};

/**
 * Describes an HTML attribute in a CEM class declaration.
 * Its field link preserves the relationship between decorator-facing markup and
 * the JavaScript member exposed by the component class.
 */
export type CustomElementsManifestAttribute = {
  name: string;
  fieldName?: string;
  description?: string;
  type?: CustomElementsManifestType;
  default?: string;
};

/**
 * Represents one custom-element class inside a CEM JavaScript module.
 * The manifest builder groups its projected members and attributes with component
 * identity and inheritance metadata for downstream documentation tools.
 */
export type CustomElementsManifestDeclaration = {
  kind: "class";
  name: string;
  customElement: true;
  tagName: string;
  description?: string;
  superclass?: {
    name: string;
  };
  members: CustomElementsManifestField[];
  attributes: CustomElementsManifestAttribute[];
};

/**
 * Connects a CEM module export to the declaration it publishes.
 * The manifest builder emits class exports when available and always records the
 * custom-element definition needed to associate a tag with its class.
 */
export type CustomElementsManifestExport = {
  kind: "js" | "custom-element-definition";
  name: string;
  declaration: {
    name: string;
  };
};

/**
 * Groups CEM declarations and exports by their published JavaScript module path.
 * `createCustomElementsManifest` creates one entry per package-owned module so
 * consumers know where each documented element can be imported.
 */
export type CustomElementsManifestModule = {
  kind: "javascript-module";
  path: string;
  declarations: CustomElementsManifestDeclaration[];
  exports: CustomElementsManifestExport[];
};

/**
 * Models the complete Custom Elements Manifest 2.1 artifact emitted by the plugin.
 * The CEM builder returns it to the coordinated writer for optional serialization
 * alongside Web Types output.
 */
export type CustomElementsManifestSchema = {
  schemaVersion: "2.1.0";
  modules: CustomElementsManifestModule[];
};

/**
 * Provides the mutable package metadata view used while registering generated files.
 * Its open shape preserves unrelated package fields while the writer updates only
 * the Web Types and Custom Elements discovery entries.
 */
export type PackageJsonWithGeneratedArtifacts = {
  name?: string;
  version?: string;
  private?: boolean;
  [key: string]: unknown;
  "web-types"?: string;
  customElements?: string;
};

/**
 * Retains source compatibility for consumers using the former Web Types-only name.
 * @deprecated Use `PackageJsonWithGeneratedArtifacts` for the coordinated outputs.
 */
export type PackageJsonWithWebTypes = PackageJsonWithGeneratedArtifacts;
