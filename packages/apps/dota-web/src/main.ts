import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {ErrorPage, HomePage} from "@dota/pages";
import {
  BlobSeparatorComponent,
  AvatarComponent,
  AvatarWrapper,
  ButtonComponent,
  CloudChamberComponent,
  CursorDisplacementComponent,
  AccordionComponent,
  DotaCarouselComponent,
  DotaSlideComponent,
  IconsComponent,
  OrbBackgroundComponent,
  PopoverComponent,
  ScrollDeckComponent
} from "@ayu-sh-kr/dota-ui";
import {initializeApp} from "@ayu-sh-kr/dota-wrap";
import {Router, RouterService} from "@ayu-sh-kr/dota-wrap/router";
import components from "virtual:dota-components";
import {ApplicationEventService} from "@ayu-sh-kr/dota-wrap/core";
import {NotificationService} from "@dota/components/utils/notification/notification.service.ts";
import {DefaultApplicationEventListenerRegistry} from "@ayu-sh-kr/dota-wrap/event";
import {MdTocComponent, MdViewComponent} from "@ayu-sh-kr/dota-md";
import {routeConfig} from "virtual:dota-routes";
import {dotaHydration} from "@ayu-sh-kr/dota-wrap/ssr";

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

applicationReady.catch(error => console.error(error))


export {routerService, notificationService, applicationEventService, applicationEventPublisher, applicationEventListener}
