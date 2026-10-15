/**
 * Lets TypeScript find the types for `import highlightjs from "markdown-it-highlightjs/core"`.
 *
 * We import the package's `core` entry because it uses the trimmed highlight.js we pass in,
 * instead of pulling in every language. The package ships types for that entry but does not
 * point to them, so this declaration connects the import to `types/core.d.ts`.
 */
declare module "markdown-it-highlightjs/core" {
  import core from "markdown-it-highlightjs/types/core";
  export default core;
}
