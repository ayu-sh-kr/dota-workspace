import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['cjs', 'es'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    minify: false,
    rollupOptions: {
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
      '@dota': resolve(__dirname, 'src')
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ]
});
