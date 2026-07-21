import {DotaPageElement, Component, SEO} from "@ayu-sh-kr/dota-wrap/core";
import { OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {Route} from "@ayu-sh-kr/dota-wrap/router";
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";

@Route({path: '/'})
@Component({
  selector: 'home-page',
  shadow: false
})
export class HomePage extends DotaPageElement {

  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      title: 'Dota Web - A Cutting-Edge Web Application',
      description: 'Dota Web is a cutting-edge web application built with the Dota framework, designed to provide an exceptional user experience. It features a sleek and modern design, seamless navigation, and lightning-fast performance. With Dota Web, you can explore a wide range of features and functionalities that cater to your needs, whether you\'re looking for a powerful tool for work or a fun platform for entertainment.',
      keywords: ['Dota Web', 'Dota Framework', 'Web Application', 'Modern Design', 'Seamless Navigation', 'Fast Performance'],
      og: {
        title: 'Dota Web - A Cutting-Edge Web Application',
        description: 'Experience the future of web applications with Dota Web, built on the powerful Dota framework. Enjoy a sleek design, seamless navigation, and lightning-fast performance.',
      }
    }
  }


  @OnEvent("connected", true)
  async onConnected() {
    GeneralUtils.scrollToTop('smooth');
  }

  render(): string {
    //language=html
    return `
           <app-header></app-header>
           <main class="min-h-screen overflow-x-clip bg-[#faf8ff] text-slate-950
                        dark:bg-[#09080b] dark:text-slate-50">
             <app-hero></app-hero>
             <app-feature></app-feature>
             <code-section></code-section>
             <reactive-dota></reactive-dota>
             <capability-section></capability-section>
             <emitter-section></emitter-section>
             <device-section></device-section>
             <our-tools></our-tools>
             <client-section></client-section>
             <faq-section></faq-section>
             <app-footer></app-footer>
           </main>
        `
  }

}
