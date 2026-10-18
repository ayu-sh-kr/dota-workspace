import {installServerGlobals} from '@ayu-sh-kr/dota-server-dom';

/**
 * Installs the module-time server globals before Dota Core is evaluated.
 *
 * Dota Core declares `class BaseElement extends HTMLElement`, so `HTMLElement` must exist first.
 * The build keeps this module as its own entry (`ssr/server-globals`): bundlers hoist external
 * imports such as Dota Core above inlined code, but emit imports of local chunks first.
 */
installServerGlobals();
