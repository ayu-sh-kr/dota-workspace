import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {find: /^@ayu-sh-kr\/dota-rendering$/, replacement: resolve(import.meta.dirname, 'src/main.ts')},
      {find: '@dota', replacement: resolve(import.meta.dirname, 'src')},
      {find: '@test', replacement: resolve(import.meta.dirname, 'test')}
    ]
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['test/**/*.ts'],
    exclude: ['test/setup/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts']
    }
  }
});
