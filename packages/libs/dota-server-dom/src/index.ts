/**
 * Pure server stand-ins for the DOM objects web components touch while rendering.
 *
 * Importing this entry defines no globals. Call `installServerGlobals()`, or import `/install`,
 * for the module-time globals a component base class needs; use `/node` for request-scoped
 * browser globals.
 */
export {NODE_TYPE, ServerCharacterData, ServerDocumentFragment, ServerNode} from './dom/server-node';
export type {ServerNodeInput} from './dom/server-node';
export {ServerElement, ServerShadowRoot} from './dom/server-element';
export {ServerDocument} from './dom/server-document';
export {ServerCustomElementRegistry} from './dom/custom-element-registry';
export {createDataset, ServerStyleDeclaration, ServerTokenList} from './dom/element-reflection';
export type {AttributeHost} from './dom/element-reflection';
export {createUnmatchedMediaQuery, InertObserver, ServerHistory, ServerLocation, ServerStorage} from './browser/browser-objects';
export {installServerGlobals} from './module-globals';
