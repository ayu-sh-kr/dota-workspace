import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const internalPackages = [
  '@ayu-sh-kr/dota-core',
  '@ayu-sh-kr/dota-event',
  '@ayu-sh-kr/dota-preloader-plugin',
  '@ayu-sh-kr/dota-rest',
  '@ayu-sh-kr/dota-router',
  '@ayu-sh-kr/dota-web-type-json',
];

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ["cjs", "es"],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.cjs'
    },
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      external: internalPackages,
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
      bundledPackages: [
        '@ayu-sh-kr/dota-core',
        '@ayu-sh-kr/dota-event',
        '@ayu-sh-kr/dota-rest',
        '@ayu-sh-kr/dota-router'
      ]
    })
  ]
})
