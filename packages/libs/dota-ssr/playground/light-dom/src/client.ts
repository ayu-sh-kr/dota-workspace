import {bootstrap, setMountStrategy} from '@ayu-sh-kr/dota-core';
import {dotaHydration} from '@ayu-sh-kr/dota-ssr';
import {COMPONENTS} from './components';

// There is no router here, so only the mount-strategy socket is wired: each host
// adopts its server-rendered DOM through the durable markers instead of re-rendering.
dotaHydration({mismatch: 'warn'}).setup?.({setMountStrategy, wrapRouteRenderer: () => {}});
bootstrap(COMPONENTS);
