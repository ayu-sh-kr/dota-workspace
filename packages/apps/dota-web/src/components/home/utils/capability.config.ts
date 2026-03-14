export interface CapabilityTab {
  id: string;
  title: string;
  filename: string;
  description: string;
  code: string;
}

const CAPABILITY_TABS: CapabilityTab[] = [
  {
    id: 'bind-event',
    title: '@BindEvent',
    filename: 'modal.component.ts',
    description:
      'Wire any DOM event on a child element directly to a component method ' +
      'by element ID — no manual querySelector or addEventListener needed.',
    code: [
      "@Component({ selector: 'app-modal' })",
      'class ModalComponent extends BaseElement {',
      '',
      "  @BindEvent({ event: 'click', id: '#open' })",
      '  openModal() {',
      "    this.setAttribute('open', 'true');",
      '  }',
      '',
      "  @BindEvent({ event: 'click', id: '#close' })",
      '  closeModal() {',
      "    this.removeAttribute('open');",
      '  }',
      '',
      '',
      '}',
    ].join('\n'),
  },
  {
    id: 'host-listener',
    title: '@HostListener',
    filename: 'dropdown.component.ts',
    description:
      "Listen for DOM events dispatched on the component's own host element. " +
      'Ideal for click, keydown, focus, and any interaction where the component itself is the target.',
    code: [
      "@Component({ selector: 'app-dropdown' })",
      'class DropdownComponent extends BaseElement {',
      '',
      "  @HostListener('click')",
      '  handleClick(e: MouseEvent) {',
      '    e.stopPropagation();',
      "    this.toggleAttribute('open');",
      '  }',
      '',
      "  @HostListener('keydown')",
      '  handleKeydown(e: KeyboardEvent) {',
      "    if (e.key === 'Escape') this.removeAttribute('open');",
      '  }',
      '',
      '}',
    ].join('\n'),
  },
  {
    id: 'window-listener',
    title: '@WindowListener',
    filename: 'toast.component.ts',
    description:
      'Capture events at the global window level from inside any component. ' +
      'Perfect for outside-click detection, global hotkeys, and resize handling.',
    code: [
      "@Component({ selector: 'app-toast' })",
      'class ToastComponent extends BaseElement {',
      '',
      "  @WindowListener('click')",
      '  onOutsideClick(e: MouseEvent) {',
      '    if (!this.contains(e.target as Node)) {',
      "      this.removeAttribute('visible');",
      '    }',
      '  }',
      '',
      "  @WindowListener('keydown')",
      '  onGlobalKeydown(e: KeyboardEvent) {',
      "    if (e.key === 'Escape') this.removeAttribute('visible');",
      '  }',
      '}',
    ].join('\n'),
  },
];

const REACTIVE_TABS: CapabilityTab[] = [
  {
    id: 'property',
    title: '@Property',
    filename: 'counter.component.ts',
    description:
      'Declare an attribute-backed reactive property. Every assignment re-renders ' +
      'the component and notifies any registered @Watcher — no manual setAttribute calls needed.',
    code: [
      "@Component({ selector: 'my-counter' })",
      'class CounterComponent extends BaseElement {',
      '',
      "  @Property({ name: 'count', type: Number, default: 0 })",
      '  count: number = 0;',
      '',
      "  @Property({ name: 'step', type: Number, default: 1 })",
      '  step: number = 1;',
      '',
      "  @Property({ name: 'label', type: String, default: 'Count' })",
      '  label: string = \'Count\';',
      '',
      '  render() {',
      '    return HTML`<p>${this.label}: ${this.count}</p>`;',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    id: 'state',
    title: '@State',
    filename: 'toggle.component.ts',
    description:
      'Mark an internal-only reactive field. @State properties trigger re-renders ' +
      'without exposing an HTML attribute — ideal for UI state that lives purely inside the component.',
    code: [
      "@Component({ selector: 'app-toggle' })",
      'class ToggleComponent extends BaseElement {',
      '',
      '  @State()',
      '  isOpen: boolean = false;',
      '',
      "  @HostListener('click')",
      '  toggle() {',
      '    this.isOpen = !this.isOpen;',
      '  }',
      '',
      '  render() {',
      "    const cls = this.isOpen ? 'panel open' : 'panel';",
      '    return HTML`<div class="${cls}">content</div>`;',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    id: 'watcher',
    title: '@Watcher',
    filename: 'counter.component.ts',
    description:
      'React to changes on any @Property-decorated field. The method receives the ' +
      'new and old values so you can run side-effects without cluttering your render logic.',
    code: [
      "@Component({ selector: 'my-counter' })",
      'class CounterComponent extends BaseElement {',
      '',
      "  @Property({ name: 'count', type: Number, default: 0 })",
      '  count: number = 0;',
      '',
      "  @Property({ name: 'step', type: Number, default: 1 })",
      '  step: number = 1;',
      '',
      "  @Watcher(['count', 'step'])",
      '  onChange(newVal: number, oldVal: number) {',
      '    console.log(`changed: ${oldVal} → ${newVal}`);',
      '    if (newVal < 0) this.count = 0;',
      '    if (newVal > 10) this.count = 0;',
      '  }',
      '}',
    ].join('\n'),
  },
];

/**
 * Registry mapping a config key (used as the `key` attribute on <tab-holder>)
 * to its array of tabs. Add new section configs here to wire up additional
 * tab-holder instances across the page.
 */
export const TAB_REGISTRY: Record<string, CapabilityTab[]> = {
  capability: CAPABILITY_TABS,
  reactive: REACTIVE_TABS,
};