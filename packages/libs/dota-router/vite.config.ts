import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import { dependencies } from './package.json' with { type: 'json' };

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
    },
  },
  build: {
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.ts'),
      formats: ['cjs', 'es'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    emptyOutDir: true,
    minify: false,
    rolldownOptions: {
      external: dependencies ? Object.keys(dependencies) : []
    }
  },

  resolve: {
    alias: {
      '@dota': resolve(import.meta.dirname, 'src')
    }
  },

  plugins: [
    dts({
      insertTypesEntry: true,
      bundleTypes: true
    })
  ]
});
