import './style.css'

import {AppComponent} from "@dota/app.component.ts";
import {
  BlogPage,
  ChatPage,
  DocPage,
  ErrorPage,
  HomePage
} from "@dota/pages";
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
import {AvatarComponent, ButtonComponent, IconsComponent} from "@ayu-sh-kr/dota-ui";
import {
  DarkModeButtonComponent,
  FooterComponent,
  GithubButtonComponent,
  NotificationComponent,
  NotificationHolderComponent
} from "@dota/components/utils";
import {DocContentComponent, DocPathComponent, DocSectionComponent} from "@dota/components/docs";
import {CounterComponent} from "@dota/components/example/CounterComponent.ts";
import {initializeApp} from "@ayu-sh-kr/dota-wrap"
import {Router, RouterService, ComponentClass } from "@ayu-sh-kr/dota-router";
import Components from 'virtual:dota-components'

console.log('Components from virtual module:', Components);
const modules: Record<string, unknown> = {
  ...import.meta.glob('/src/**/*.component.ts', {eager: true}),
  ...import.meta.glob('/src/components/*.component.ts', {eager: true}),
  ...import.meta.glob('/src/pages/*.page.ts', {eager: true}),
};

let routerService!: RouterService<Router<HTMLElement>>;
initializeApp({
  modules: modules,
  externalComponents: [IconsComponent] as unknown as ComponentClass[],
  errorRoute: {path: '/error', component: ErrorPage},
  defaultRoute: {path: '/', component: HomePage},
  root: AppComponent,
})
  .then((value) => {
    routerService = value.routerService
  })
  .catch(error => console.error(error))

export {routerService}

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
    'feature-component': FeatureComponent,
    'footer-component': FooterComponent,
    'error-page': ErrorPage,
    'blog-page': BlogPage,
    'chat-page': ChatPage,
    'counter-component': CounterComponent,
    "dota-button": ButtonComponent,
    "d-avatar": AvatarComponent,
    "dota-icon": IconsComponent
  }
}