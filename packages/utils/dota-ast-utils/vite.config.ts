import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts'
import { dependencies } from './package.json';

export default defineConfig({
  build: {
    lib: {
      entry : resolve(__dirname, 'src/main.ts'),
      formats: ["cjs", "es"],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.js'
    },
    minify: false,
    rollupOptions: {
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
      rollupTypes: true
    })
  ]
})
