import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {BlogPage, ChatPage, DocPage, ErrorPage, HomePage} from "@dota/pages";
import {
  ClientSectionComponent,
  CodeSectionComponent,
  DeviceSectionComponent,
  FeatureComponent,
  GetStartedButtonComponent,
  HeaderComponent,
  HeroSectionComponent,
  HostListenerSectionComponent,
  OfferComponent,
  OurToolsComponent,
  ReactiveSectionComponent
} from "@dota/components/home";
import {AvatarComponent, ButtonComponent, IconsComponent, PopoverComponent} from "@ayu-sh-kr/dota-ui";
import {
  DarkModeButtonComponent,
  FooterComponent,
  GithubButtonComponent,
  NotificationComponent,
  NotificationHolderComponent
} from "@dota/components/utils";
import {DocContentComponent, DocHeaderComponent, DocPathComponent, DocSectionComponent, DocSidebarComponent, ThemePickerComponent} from "@dota/components/docs";
import {CounterComponent} from "@dota/components/example/counter.component.ts";
import {initializeApp} from "@ayu-sh-kr/dota-wrap"
import {ComponentClass, Router, RouterService} from "@ayu-sh-kr/dota-router";
import components from "virtual:dota-components";
import {ApplicationEventService} from "@ayu-sh-kr/dota-core";
import {NotificationService} from "@dota/components/utils/notification/notification.service.ts";
import {DefaultApplicationEventListenerRegistry} from "@ayu-sh-kr/dota-event";

const applicationEventService = ApplicationEventService.getInstance();

let routerService!: RouterService<Router<HTMLElement>>;
let notificationService!: NotificationService
initializeApp({
  modules: components,
  externalComponents: [IconsComponent, PopoverComponent] as unknown as ComponentClass[],
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

declare global {
  interface HTMLElementTagNameMap {
    'app-offer': OfferComponent,
    'app-header': HeaderComponent,
    'app-hero': HeroSectionComponent,
    'notification-holder': NotificationHolderComponent
    'app-notification': NotificationComponent
    'home-page': HomePage
    'doc-page': DocPage,
    'app-root': AppComponent,
    'code-section': CodeSectionComponent,
    'device-section': DeviceSectionComponent,
    'get-started-button': GetStartedButtonComponent,
    'dark-mode-button': DarkModeButtonComponent,
    'github-button': GithubButtonComponent,
    'our-tools': OurToolsComponent,
    'reactive-section': ReactiveSectionComponent,
    'host-listener-section': HostListenerSectionComponent,
    'client-section': ClientSectionComponent,
    'doc-path': DocPathComponent,
    'doc-content': DocContentComponent,
    'doc-section': DocSectionComponent,
    'doc-header': DocHeaderComponent,
    'doc-sidebar': DocSidebarComponent,
    'feature-component': FeatureComponent,
    'footer-component': FooterComponent,
    'error-page': ErrorPage,
    'blog-page': BlogPage,
    'chat-page': ChatPage,
    'counter-component': CounterComponent,
    "dota-button": ButtonComponent,
    "d-avatar": AvatarComponent,
    "dota-icon": IconsComponent,
    "dota-popover": PopoverComponent,
    "theme-picker": ThemePickerComponent,
  }
}