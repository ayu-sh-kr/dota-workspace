import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: 'node22',
    lib: {
      // `install` stays its own entry: importing it must define globals before later imports evaluate.
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        install: resolve(import.meta.dirname, 'src/install.ts'),
        'node/index': resolve(import.meta.dirname, 'src/node/index.ts')
      },
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    minify: false,
    rolldownOptions: {
      platform: 'node',
      external: [/^node:.*/],
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
  plugins: [dts({insertTypesEntry: true, include: ['src'], entryRoot: 'src'})]
});
