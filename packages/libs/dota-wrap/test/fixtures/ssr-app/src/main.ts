import {initializeApp} from '@ayu-sh-kr/dota-wrap';
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';
import {AboutPage, AppRoot, ErrorPage, HomePage, TaskEditPage, TaskPage} from './pages';

// Browser-only startup chained on the promise never runs on the server.
export const applicationReady = initializeApp({
  modules: [AppRoot, TaskPage, TaskEditPage, AboutPage, HomePage, ErrorPage],
  errorRoute: {path: '/error', component: ErrorPage},
  defaultRoute: {path: '/', component: HomePage},
  root: AppRoot,
  plugins: [dotaHydration()]
}).then(() => window.scrollTo(0, 0));
