import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {ErrorPage, HomePage} from "@dota/pages";
import {DotaCarouselComponent, DotaSlideComponent, IconsComponent, PopoverComponent, ButtonComponent} from "@ayu-sh-kr/dota-ui";
import {initializeApp} from "@ayu-sh-kr/dota-wrap"
import {Router, RouterService} from "@ayu-sh-kr/dota-router";
import components from "virtual:dota-components";
import {ApplicationEventService} from "@ayu-sh-kr/dota-core";
import {NotificationService} from "@dota/components/utils/notification/notification.service.ts";
import {DefaultApplicationEventListenerRegistry} from "@ayu-sh-kr/dota-event";
import {MdTocComponent, MdViewComponent } from "@ayu-sh-kr/dota-md";

const applicationEventService = ApplicationEventService.getInstance();

let routerService!: RouterService<Router<HTMLElement>>;
let notificationService!: NotificationService
initializeApp({
  modules: components,
  externalComponents: [
    IconsComponent, PopoverComponent, MdViewComponent,
    MdTocComponent, DotaCarouselComponent, DotaSlideComponent,
    ButtonComponent
  ],
  errorRoute: {path: '/error', component: ErrorPage},
  defaultRoute: {path: '/', component: HomePage},
  root: AppComponent,
})
  .then((value) => {
    const listener = applicationEventService
      .getListener();
    DefaultApplicationEventListenerRegistry.setListener(listener)
    routerService = value.routerService
    notificationService = new NotificationService()
    applicationEventService
      .getPublisher()
      .publishAsync({
        name: "app:initialized",
        data: null
      })
  })
  .catch(error => console.error(error))


export {routerService, notificationService}