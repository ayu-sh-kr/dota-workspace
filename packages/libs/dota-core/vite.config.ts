import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import {dependencies} from './package.json';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      external: dependencies ? Object.keys(dependencies) : []
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
