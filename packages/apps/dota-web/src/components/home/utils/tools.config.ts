export interface DotaTool {
  id: string;
  name: string;
  icon: string;
  role: string;
  tagline: string;
  description: string;
  tags: string[];
  modes: string[];
  related: string[];
  position: { x: number; y: number };
}

export const DOTA_TOOLS: DotaTool[] = [
  {
    id: 'dota-core',
    name: 'dota-core',
    icon: 'material-symbols:schema-rounded',
    role: 'Foundation',
    tagline: 'The foundation of everything.',
    description:
      'Build framework-agnostic web components using TypeScript decorators and a ' +
      'built-in reactivity system. @Component, @Property, @State, @HostListener, ' +
      'and @BindEvent wire your UI with zero manual DOM boilerplate.',
    tags: ['Decorators', 'Reactivity', 'Lifecycle', 'Web Components'],
    modes: ['build-ui'],
    related: ['dota-ui', 'dota-event', 'dota-wrap', 'dota-md'],
    position: { x: 50, y: 47 },
  },
  {
    id: 'dota-rest',
    name: 'dota-rest',
    icon: 'material-symbols:api-rounded',
    role: 'HTTP',
    tagline: 'HTTP, without the ceremony.',
    description:
      'A typed, fluent HTTP client built on the native Fetch API. Chain interceptors, ' +
      'set headers, handle responses, and manage errors — all through a clean builder ' +
      'interface that reads like prose and compiles to nothing extra.',
    tags: ['Fetch API', 'Typed', 'Interceptors', 'Fluent Builder'],
    modes: ['fetch-data'],
    related: ['dota-core', 'dota-event'],
    position: { x: 24, y: 25 },
  },
  {
    id: 'dota-router',
    name: 'dota-router',
    icon: 'material-symbols:navigation-rounded',
    role: 'Navigation',
    tagline: 'Navigate with intention.',
    description:
      'Declarative client-side routing with hash and history modes. Define routes, ' +
      'attach guards, and handle deep links — the router manages every transition ' +
      'so your components stay focused on rendering, not navigation state.',
    tags: ['SPA', 'Hash Mode', 'History Mode', 'Route Guards'],
    modes: ['route-apps'],
    related: ['dota-core', 'dota-wrap', 'dota-ui'],
    position: { x: 76, y: 25 },
  },
  {
    id: 'dota-event',
    name: 'dota-event',
    icon: 'material-symbols:cell-tower-rounded',
    role: 'Messaging',
    tagline: 'Events that travel freely.',
    description:
      'A lightweight publish-subscribe event bus for decoupled component communication. ' +
      'Emit typed events and subscribe across any depth of your component tree — ' +
      'no explicit parent-child wiring, no shared globals.',
    tags: ['Pub-Sub', 'Typed Events', 'Decoupled', 'Event Bus'],
    modes: ['handle-events'],
    related: ['dota-core', 'dota-rest', 'dota-ui'],
    position: { x: 28, y: 68 },
  },
  {
    id: 'dota-wrap',
    name: 'dota-wrap',
    icon: 'material-symbols:layers-rounded',
    role: 'Composition',
    tagline: 'Wrap once, use everywhere.',
    description:
      'Framework adapters that bridge Dota web components into React, Vue, Angular, ' +
      'or plain HTML. One component definition, every runtime — no rewrites, ' +
      'no redundancy, no framework lock-in.',
    tags: ['React', 'Vue', 'Angular', 'Adapters'],
    modes: ['build-ui'],
    related: ['dota-core', 'dota-router', 'dota-ui'],
    position: { x: 72, y: 68 },
  },
  {
    id: 'dota-vite-preloader',
    name: 'dota-vite-preloader',
    icon: 'material-symbols:bolt-rounded',
    role: 'Performance',
    tagline: 'Ship faster, load smarter.',
    description:
      'A Vite plugin that pre-processes Dota components at build time and injects ' +
      'optimised preload hints automatically. Eliminate render-blocking and cut ' +
      'first-paint time without touching a single configuration line.',
    tags: ['Vite Plugin', 'Build Time', 'Preload Hints', 'Performance'],
    modes: ['optimize-loading'],
    related: ['dota-core', 'dota-router'],
    position: { x: 12, y: 48 },
  },
  {
    id: 'dota-ui',
    name: 'dota-ui',
    icon: 'material-symbols:widgets-rounded',
    role: 'Components',
    tagline: 'Beautiful components, out of the box.',
    description:
      'A curated collection of styled, accessible web components — buttons, modals, ' +
      'inputs, toasts, dropdowns, and more — built on dota-core and designed to drop ' +
      'straight into any project with no extra configuration.',
    tags: ['UI Kit', 'Accessible', 'Dark Mode', 'Plug & Play'],
    modes: ['build-ui'],
    related: ['dota-core', 'dota-wrap', 'dota-event'],
    position: { x: 88, y: 48 },
  },
  {
    id: 'dota-md',
    name: 'dota-md',
    icon: 'material-symbols:article-rounded',
    role: 'Content',
    tagline: 'Markdown, rendered beautifully.',
    description:
      'A lightweight Markdown-to-HTML renderer with syntax highlighting and clean ' +
      'typographic defaults. Ideal for documentation blocks, code previews, and ' +
      'any component that needs to display rich structured content.',
    tags: ['Markdown', 'Syntax Highlight', 'Docs', 'Renderer'],
    modes: ['render-content'],
    related: ['dota-core', 'dota-ui'],
    position: { x: 50, y: 84 },
  },
];
