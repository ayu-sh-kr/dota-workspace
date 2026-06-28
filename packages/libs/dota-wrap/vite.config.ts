import { resolve } from 'path';
import { defineConfig } from 'vite';
import { dependencies } from './package.json';

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
      external: dependencies ? Object.keys(dependencies) : []
    }
  },

  resolve: {
    alias: {
      '@dota': resolve('./src')
    }
  }
})
