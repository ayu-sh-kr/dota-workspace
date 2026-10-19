import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {ErrorPage, HomePage} from "@dota/pages";
import {createDotaLogger, initializeApp} from "@ayu-sh-kr/dota-wrap";
import {Router, RouterService} from "@ayu-sh-kr/dota-wrap/router";
import {componentRegistry} from "virtual:dota-component-registry";
import {ApplicationEventService} from "@ayu-sh-kr/dota-wrap/core";
import {NotificationService} from "@dota/components/utils/notification/notification.service.ts";
import {DefaultApplicationEventListenerRegistry} from "@ayu-sh-kr/dota-wrap/event";
import {routeConfig} from "virtual:dota-routes";
import {dotaHydration} from "@ayu-sh-kr/dota-wrap/ssr";
import {libraryComponents} from "@dota/configs/components.config.ts";

const logger = createDotaLogger('dota-web', 'main.ts');

const applicationEventService = ApplicationEventService.getInstance();
const applicationEventPublisher = applicationEventService.getPublisher();
const applicationEventListener = applicationEventService.getListener();

let routerService!: RouterService<Router<HTMLElement>>;
let notificationService!: NotificationService;

export const applicationReady = initializeApp({
  // Only the root is defined up front; each route loads the components it renders.
  modules: [AppComponent],
  lazyComponents: [componentRegistry, libraryComponents],
  routes: routeConfig,
  errorRoute: {path: '/error', component: ErrorPage},
  defaultRoute: {path: '/', component: HomePage},
  root: AppComponent,
  plugins: [dotaHydration({mismatch: 'warn'})],
  globalHooks: {
    afterEach: [context => {
      if (context.url.hash) return;
      window.scrollTo({top: 0, behavior: 'instant'});
    }]
  }
})
  .then((value) => {
    DefaultApplicationEventListenerRegistry.setListener(applicationEventListener)
    routerService = value.routerService
    notificationService = new NotificationService()
    applicationEventPublisher
      .publishAsync({
        name: "app:initialized",
        data: null
      })
  })

applicationReady.catch(error => logger.error('Application initialization failed', error))


export {routerService, notificationService, applicationEventService, applicationEventPublisher, applicationEventListener}
