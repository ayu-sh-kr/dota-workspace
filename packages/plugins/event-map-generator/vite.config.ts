import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

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
    minify: false,
    rolldownOptions: {
      external: [
        /^node:.*/,
        'fs',
        'path',
        'url',
        'fast-glob',
        '@swc/core',
        'consola',
        'vite',
        '@ayu-sh-kr/dota-ast-utils'
      ]
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
