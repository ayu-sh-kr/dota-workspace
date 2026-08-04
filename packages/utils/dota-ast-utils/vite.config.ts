import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts'
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
      entry : resolve(import.meta.dirname, 'src/main.ts'),
      formats: ["cjs", "es"],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    minify: false,
    rolldownOptions: {
      external: ['node:path', ...(dependencies ? Object.keys(dependencies) : [])]
    }
  },

  resolve: {
    alias: {
      '@dota': resolve('./src')
    }
  },

  plugins: [
    dts({
      insertTypesEntry: true,
      bundleTypes: true
    })
  ]
})
