import {AfterInit, DotaPageElement, Component, HTML, SEO} from "@ayu-sh-kr/dota-core";
import {Route} from "@ayu-sh-kr/dota-router";
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


  @AfterInit()
  afterViewInit() {
    GeneralUtils.scrollToTop('instant');
  }

  render(): string {
    //language=html
    return HTML`
           <app-offer visible="true"></app-offer>
           <app-header></app-header>
           <app-hero></app-hero>
           <blob-separator side="left" index="0"></blob-separator>
           <app-feature></app-feature>
           <blob-separator side="right" index="1"></blob-separator>
           <code-section></code-section>
           <blob-separator side="left" index="2"></blob-separator>
           <reactive-dota></reactive-dota>
           <blob-separator side="right" index="3"></blob-separator>
           <capability-section></capability-section>
           <blob-separator side="left" index="1"></blob-separator>
           <emitter-section></emitter-section>
           <blob-separator side="right" index="2"></blob-separator>
           <device-section></device-section>
           <blob-separator side="left" index="3"></blob-separator>
           <our-tools></our-tools>
           <blob-separator side="right" index="0"></blob-separator>
           <client-section></client-section>
           <app-footer></app-footer>
        `
  }

}