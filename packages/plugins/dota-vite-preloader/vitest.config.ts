import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
    },
  },
  resolve: {
    alias: {
      '@dota': path.resolve(import.meta.dirname, 'src'),
      '@test': path.resolve(import.meta.dirname, 'test')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    exclude: ['test/setup/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts']
    }
  }
});
