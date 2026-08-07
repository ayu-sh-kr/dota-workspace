import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'vite/index': resolve(import.meta.dirname, 'src/vite/index.ts')
      },
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    minify: false,
    rolldownOptions: {
      external: [
        /^node:.*/,
        '@ayu-sh-kr/dota-core',
        '@ayu-sh-kr/dota-rendering',
        '@ayu-sh-kr/dota-router',
        '@ayu-sh-kr/dota-runtime',
        'consola',
        'happy-dom',
        'vite'
      ],
      output: {
        exports: 'named'
      }
    }
  },
  resolve: {
    alias: {
      '@dota': resolve(import.meta.dirname, 'src')
    }
  },
  plugins: [dts({insertTypesEntry: true})]
});
