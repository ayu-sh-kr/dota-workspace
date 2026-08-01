import {defineConfig} from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@dota': path.resolve(__dirname, 'src')
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
