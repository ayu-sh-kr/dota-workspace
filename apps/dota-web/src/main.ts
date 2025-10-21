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
import {Router, RouterService } from "@ayu-sh-kr/dota-router";

const modules: Record<string, () => Promise<unknown>> = {
  ...import.meta.glob('/src/**/*.component.ts'),
  ...import.meta.glob('/src/components/*.component.ts'),
  ...import.meta.glob('/src/pages/*.page.ts'),
};

let routerService!: RouterService<Router<HTMLElement>>;
initializeApp(modules, [IconsComponent as unknown as CustomElementConstructor], {path: '/error', component: ErrorPage}, {path: '/', component: HomePage})
  .then((value) => {
    routerService = value.routerService
  })
  .catch(error => console.error(error))

export {routerService}

declare global {
  interface HTMLTagNameMap {
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