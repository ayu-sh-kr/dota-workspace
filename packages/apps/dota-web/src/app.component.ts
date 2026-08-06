import '@dota/pages/home.page.ts'
import '@dota/pages/doc.page.ts'
import '@dota/pages/error.page.ts'
import {GeneralUtils} from "@dota/utils/GeneralUtils.ts";
import {AfterInit, BaseElement, Component } from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";


@Component({
  selector: 'app-root',
  shadow: false
})
export class AppComponent extends BaseElement {

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    const browserTheme = GeneralUtils.getBrowserTheme();
    GeneralUtils.setBrowserTheme(browserTheme);
  }

  render(): TemplateResult {
    return html``
  }

}
