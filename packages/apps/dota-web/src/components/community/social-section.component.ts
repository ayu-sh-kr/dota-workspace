import {BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

@Component({
  selector: "social-section",
  shadow: false
})
export class SocialSectionComponent extends BaseElement {

  data: SocialDataType[] = [
    {
      icon: 'mdi:discord',
      heading: 'Discord',
      description: 'Join our Discord community to connect with other developers, share ideas, and get support.',
      buttonText: 'Join Now',
    },

    {
      icon: 'mdi:github',
      heading: 'GitHub',
      description: 'Contribute to our open-source projects on GitHub. We welcome pull requests and issues.',
      link: 'https://github.com/ayu-sh-kr/dota-web',
      buttonText: 'View on GitHub'
    },

    {
      icon: 'mdi:twitter',
      heading: 'Twitter',
      description: 'Follow us on Twitter for the latest updates, news, and announcements.',
      buttonText: 'Follow Us'
    },

    {
      icon: 'mdi:youtube',
      heading: 'YouTube',
      description: 'Watch our tutorials and webinars on YouTube to learn more about our projects.',
      buttonText: 'Subscribe Now'
    }
  ]

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`
      <section class="layout-page layout-section home-section-divider">
        <section-header level="2" eyebrow="Socials" heading="Follow along"
                        description="Talk with other developers and keep up with releases."></section-header>

        <div class="layout-card-grid">
          ${this.data.map((item) => html`
            <div class="surface-card flex flex-col gap-4 p-[var(--layout-pad-card)]">
              <dota-icon name="${item.icon}" color="slate" variant="ghost" size="xl"></dota-icon>
              <div class="flex flex-col gap-2">
                <h3 class="font-semibold text-foreground">${item.heading}</h3>
                <p class="type-compact text-muted">${item.description}</p>
              </div>
              <social-button class="mt-auto" text="${item.buttonText}" link="${item.link || ''}"></social-button>
            </div>`)}
        </div>
      </section>
    `
  }
}

export interface SocialDataType {
  icon: string;
  heading: string;
  description: string;
  link?: string;
  buttonText: string;
}
