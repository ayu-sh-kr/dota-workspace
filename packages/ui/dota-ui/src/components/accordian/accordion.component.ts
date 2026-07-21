import {BaseElement, BindEvent, Component, Object as ObjectType, Property, String} from "@ayu-sh-kr/dota-core";
import "@dota/components/icon/icons.component.ts";
import './accordion.css';
import {AccordionStyle} from "@dota/components/accordian/accordion.config.ts";
import type {AccordionColor, AccordionSize, AccordionStyleConfig, AccordionVariant} from "@dota/components/accordian/accordion.config.ts";


/**
 * Renders a themed, animated disclosure panel for a short header and description.
 *
 * Inputs: `classname` adds outer-container classes; `header` and `description`
 * provide the visible copy; and `icon` adds an optional leading `dota-icon`.
 * `color`, `variant`, and `size` select `AccordionStyle` button entries, falling
 * back to gray, solid, and md respectively. `config` is a JSON `AccordionStyleConfig`
 * attribute that overrides individual style slots while retaining all interaction logic.
 * Events: header-button clicks toggle the description's expanded class and
 * `aria-hidden`, set `aria-expanded`, and rotate the trailing arrow; no custom event emits.
 * Lifecycle and integration: light DOM lets Tailwind classes from the selected style
 * apply directly. The clipped content wrapper keeps the grid-row transition smooth and
 * fully hides paragraph spacing when closed; `dota-icon` must be registered by the host app.
 */
@Component({
  selector: 'dota-accordion',
  shadow: false
})
class AccordionComponent extends BaseElement {

  /** Additional CSS classes to be applied to the accordion container */
  @Property({name: 'classname', type: String})
  className!: string;

  /** Text content displayed in the accordion header */
  @Property({name: 'header', type: String})
  header!: string;

  /** Content displayed when the accordion is expanded */
  @Property({name: 'description', type: String})
  description!: string;

  /** Icon name to be displayed before the header text */
  @Property({name: 'icon', type: String})
  icon!: string;

  /** Color theme of the accordion */
  @Property({name: 'color', type: String})
  color!: AccordionColor;

  /** Visual style variant of the accordion */
  @Property({name: 'variant', type: String})
  variant!: AccordionVariant

  /** Size variant of the accordion */
  @Property({name: 'size', type: String})
  size!: AccordionSize

  /** Optional style configuration that overrides the default visual treatment. */
  @Property({name: 'config', type: ObjectType})
  config?: AccordionStyleConfig;

  constructor() {
    super();
  }


  @BindEvent({event: 'click', id: '#header'})
  handleAccordion() {
    const element = this.querySelector('#description');
    if (element) {
      const isExpanded = element.classList.toggle('description-active');
      element.setAttribute('aria-hidden', `${!isExpanded}`);

      const header = this.querySelector('#header');
      header?.setAttribute('aria-expanded', `${isExpanded}`);

      const icon = this.querySelector('#icon');
      icon?.classList.toggle('active', isExpanded);
    }
  }

  /**
   * Processes the icon name and returns the HTML string for the icon component.
   * @param icon - The name of the icon to be displayed
   * @returns HTML string containing the icon component or empty string if no icon provided
   */
  processIcon = (icon: string) => {
    return icon ? `<dota-icon className="text-blue-400 text-xl" name="${icon}"></dota-icon>` : '';
  }

  /**
   * Resolves a consumer-supplied theme against the library defaults.
   * Each missing slot falls back independently, so consumers can override one
   * part of the visual design without restating the entire configuration.
   */
  private getStyle() {
    const override = this.config;
    const color = this.color ?? 'gray';
    const variant = this.variant ?? 'solid';

    return {
      container: override?.container ?? AccordionStyle.container,
      button: {
        base: override?.button?.base ?? AccordionStyle.button.base,
        size: override?.button?.size?.[this.size] ?? AccordionStyle.button.size[this.size] ?? AccordionStyle.button.size.md,
        color: override?.button?.color?.[color]?.[variant] ?? AccordionStyle.button.color[color]?.[variant] ?? AccordionStyle.button.color.gray.soft,
      },
      paragraph: override?.paragraph ?? AccordionStyle.paragraph,
    };
  }

  render(): string {
    const style = this.getStyle();

    return `
        <div class="${this.className ?? ''} ${style.container} w-full flex flex-col">
            <button type="button" id="header" aria-controls="description" aria-expanded="false" class="${style.button.base} ${style.button.size} ${style.button.color}">
                <div class="flex">
                    ${this.processIcon(this.icon)}
                    <span class="text-left break-all line-clamp-1">${this.header}</span>
                </div>
                <div id="icon" class="icon">
                    <dota-icon name="material-symbols:arrow-forward-ios-rounded"></dota-icon>
                </div>
            </button>
            <div id="description" class="description" aria-hidden="true">
                <div class="accordion-content">
                    <p id="content" class="${style.paragraph}">${this.description}</p>
                </div>
            </div>
        </div>
        `
  }
}


export {
  AccordionComponent,
  AccordionStyle as AccordionConfig,
  type AccordionStyleConfig,
  type AccordionColor,
  type AccordionSize,
  type AccordionVariant
}
