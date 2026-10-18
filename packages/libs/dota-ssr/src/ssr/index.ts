// Must stay first: Dota Core needs a global HTMLElement before it is evaluated.
import './server-globals';

export {ServerCustomElementRegistry, ServerDocument, ServerElement, ServerShadowRoot} from '@ayu-sh-kr/dota-server-dom';
export {runInBrowserScope} from '@ayu-sh-kr/dota-server-dom/node';
export {createStringAdapter} from './string-adapter';
export {captureApplication, createApplicationHandler, resolveServerRoutes} from './application';
export {escapeHtml, serializeOutput} from '@ayu-sh-kr/dota-rendering/server';
export {BODY_OUTLET, HEAD_OUTLET, prepareDocumentShell, renderDocument, renderHead} from './document';
export {createRequestHandler, matchRoute, toNodeListener} from './request-handler';
export type * from './types';
export type {CapturedApplication} from '../application-capture';
