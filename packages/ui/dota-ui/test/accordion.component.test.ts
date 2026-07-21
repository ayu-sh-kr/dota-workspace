import {AccordionComponent} from '@dota/components/accordian/accordion.component.ts';
import {afterEach, describe, expect, it} from 'vitest';

const createAccordion = (properties: Partial<AccordionComponent> = {}) => {
  const accordion = document.createElement('dota-accordion-test') as AccordionComponent;
  const {config, ...rest} = properties;
  Object.assign(accordion, rest);
  if (config) accordion.setAttribute('config', JSON.stringify(config));
  accordion.innerHTML = accordion.render();
  document.body.appendChild(accordion);
  return accordion;
};

if (!customElements.get('dota-accordion-test')) {
  customElements.define('dota-accordion-test', AccordionComponent);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AccordionComponent', () => {
  it('renders the header, description, and collapsed accessibility state', () => {
    const accordion = createAccordion({
      header: 'Shipping details',
      description: 'Ships within two business days.',
    });

    const header = accordion.querySelector<HTMLButtonElement>('#header');
    const description = accordion.querySelector<HTMLElement>('#description');

    expect(header?.textContent).toContain('Shipping details');
    expect(header?.getAttribute('aria-controls')).toBe('description');
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    expect(description?.textContent).toContain('Ships within two business days.');
    expect(description?.getAttribute('aria-hidden')).toBe('true');
    expect(description?.classList.contains('description-active')).toBe(false);
  });

  it('renders an optional leading icon and keeps it absent when no icon is provided', () => {
    const withIcon = createAccordion({header: 'Account', icon: 'person'});
    expect(withIcon.querySelector('dota-icon[name="person"]')).not.toBeNull();

    const withoutIcon = createAccordion({header: 'Account', icon: ''});
    expect(withoutIcon.querySelector('dota-icon[name="person"]')).toBeNull();
    expect(withoutIcon.querySelector('#header > div')?.textContent).toContain('Account');
  });

  it('uses supplied style configuration while retaining default values for missing slots', () => {
    const accordion = createAccordion({
      header: 'Themed section',
      size: 'lg',
      config: {
        container: 'custom-container',
        button: {base: 'custom-button', size: {lg: 'custom-size'}},
        paragraph: 'custom-paragraph',
      },
    });

    expect(accordion.firstElementChild?.className).toContain('custom-container');
    expect(accordion.querySelector('#header')?.className).toContain('custom-button');
    expect(accordion.querySelector('#header')?.className).toContain('custom-size');
    expect(accordion.querySelector('#content')?.className).toBe('custom-paragraph');
  });

  it('toggles the expanded state and arrow class when the header is clicked', () => {
    const accordion = createAccordion({header: 'More information', description: 'Details'});
    const header = accordion.querySelector<HTMLButtonElement>('#header')!;
    const description = accordion.querySelector<HTMLElement>('#description')!;
    const icon = accordion.querySelector<HTMLElement>('#icon')!;

    header.click();

    expect(description.classList.contains('description-active')).toBe(true);
    expect(description.getAttribute('aria-hidden')).toBe('false');
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(icon.classList.contains('active')).toBe(true);

    header.click();

    expect(description.classList.contains('description-active')).toBe(false);
    expect(description.getAttribute('aria-hidden')).toBe('true');
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(icon.classList.contains('active')).toBe(false);
  });

  it('does nothing when the controlled description is missing', () => {
    const accordion = createAccordion({header: 'Incomplete section'});
    accordion.querySelector('#description')?.remove();

    expect(() => accordion.handleAccordion()).not.toThrow();
    expect(accordion.querySelector('#header')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('falls back to the default color when an unknown color or variant is supplied', () => {
    const accordion = createAccordion({
      header: 'Fallback theme',
      color: 'not-a-color' as never,
      variant: 'not-a-variant' as never,
      size: 'not-a-size' as never,
    });

    expect(accordion.querySelector('#header')?.className).toContain('bg-gray-50');
  });
});
