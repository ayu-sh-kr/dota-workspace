import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {ErrorPage, HomePage} from "@dota/pages";
import {
  BlobSeparatorComponent,
  ButtonComponent,
  CloudChamberComponent,
  CursorDisplacementComponent,
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

const applicationEventService = ApplicationEventService.getInstance();
const applicationEventPublisher = applicationEventService.getPublisher();
const applicationEventListener = applicationEventService.getListener();

let routerService!: RouterService<Router<HTMLElement>>;
let notificationService!: NotificationService;

initializeApp({
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
  ],
  errorRoute: {path: '/error', component: ErrorPage},
  defaultRoute: {path: '/', component: HomePage},
  root: AppComponent,
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
  .catch(error => console.error(error))


export {routerService, notificationService, applicationEventService, applicationEventPublisher, applicationEventListener}
