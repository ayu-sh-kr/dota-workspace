import './style.css'
import 'highlight.js/styles/github-dark.css'

import {AppComponent} from "@dota/app.component.ts";
import {ErrorPage, HomePage} from "@dota/pages";
import {
  BlobSeparatorComponent,
  AvatarComponent,
  AvatarWrapper,
  BreadcrumbComponent,
  ButtonComponent,
  CloudChamberComponent,
  CursorDisplacementComponent,
  AccordionComponent,
  DotaCarouselComponent,
  DotaSlideComponent,
  IconsComponent,
  OrbBackgroundComponent,
  PopoverComponent,
  ScrollDeckComponent,
  DotaAlertComponent
} from "@ayu-sh-kr/dota-ui";
import {createDotaLogger, initializeApp} from "@ayu-sh-kr/dota-wrap";
import {Router, RouterService} from "@ayu-sh-kr/dota-wrap/router";
import components from "virtual:dota-components";
import {ApplicationEventService} from "@ayu-sh-kr/dota-wrap/core";
import {NotificationService} from "@dota/components/utils/notification/notification.service.ts";
import {DefaultApplicationEventListenerRegistry} from "@ayu-sh-kr/dota-wrap/event";
import {MDService, MdTocComponent, MdViewComponent} from "@ayu-sh-kr/dota-md";
import {routeConfig} from "virtual:dota-routes";
import {dotaHydration} from "@ayu-sh-kr/dota-wrap/ssr";
import {markdownSetup} from "@dota/configs/markdown.config.ts";

MDService.configure(markdownSetup);
IconsComponent.baseUrl = `${import.meta.env.BASE_URL}assets/icons`;
const logger = createDotaLogger('dota-web', 'main.ts');

const applicationEventService = ApplicationEventService.getInstance();
const applicationEventPublisher = applicationEventService.getPublisher();
const applicationEventListener = applicationEventService.getListener();

let routerService!: RouterService<Router<HTMLElement>>;
let notificationService!: NotificationService;

export const applicationReady = initializeApp({
  modules: components,
  routes: routeConfig,
  externalComponents: [
    IconsComponent,
    PopoverComponent,
    MdViewComponent,
    MdTocComponent,
    DotaCarouselComponent,
    DotaSlideComponent,
    ScrollDeckComponent,
    ButtonComponent,
    BlobSeparatorComponent,
    OrbBackgroundComponent,
    CloudChamberComponent,
    CursorDisplacementComponent,
    AccordionComponent,
    AvatarComponent,
    AvatarWrapper,
    BreadcrumbComponent,
    DotaAlertComponent,
  ],
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
