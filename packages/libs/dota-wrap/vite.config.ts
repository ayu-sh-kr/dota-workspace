import { resolve } from 'path';
import { defineConfig } from 'vite';

// Node.js-only Vite plugins (native addons cannot be bundled for browser)
// reflect-metadata is a global singleton and must not be duplicated
const EXTERNAL = [
  '@ayu-sh-kr/dota-preloader-plugin',
  '@ayu-sh-kr/dota-web-type-json',
  'reflect-metadata',
];

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'event/index': resolve(__dirname, 'src/event/index.ts'),
        'preloader-plugin/index': resolve(__dirname, 'src/preloader-plugin/index.ts'),
        'router/index': resolve(__dirname, 'src/router/index.ts'),
        'rest/index': resolve(__dirname, 'src/rest/index.ts'),
        'web-type-json/index': resolve(__dirname, 'src/web-type-json/index.ts')
      },
      formats: ["cjs", "es"],
      fileName: (format, entryName) => format === 'es' ? `${entryName}.mjs` : `${entryName}.js`
    },
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      external: EXTERNAL
    }
  },

  resolve: {
    alias: {
      '@dota': resolve('./src')
    }
  }
})
