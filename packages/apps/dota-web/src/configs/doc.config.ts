export interface DocConfig {
  category: string;
  paths: string[];
}

export const docConfigs: DocConfig[] = [
  {
    paths: ['Getting-Started.md', 'Guides.md'],
    category: 'Introduction'
  },

  {
    category: 'Guide',
    paths: [
      'Component-Registration.md', 'Component-Definition.md',
      'Property-Binding.md', 'Event-Binding.md', 'Event-Emitter.md', 'Reactivity.md',
    ]
  },
  {
    category: 'Concepts',
    paths: [
     'Core.md', 'Decorators.md', 'Life-Cycle.md'
    ]
  },

  {
    category: 'Tools',
    paths: [
      'Rest-Client.md', 'Router.md'
    ]
  }
]

/** Every docs Markdown file in sidebar order, used for navigation and SSG routes. */
export const docFiles: string[] = docConfigs.flatMap(config => config.paths);
