import {defineConfig} from "vite";
import {resolve} from "path";
import dts from 'vite-plugin-dts'
import dotaWebTypeJson from "@ayu-sh-kr/dota-web-type-json";
import eventMapGenerator from "@ayu-sh-kr/dota-event-map-generator";

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
      name: 'dota-md',
      formats: ["es", "cjs"],
      fileName: (format) => `dota-md.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    minify: false,

    rolldownOptions: {
      external: ['@ayu-sh-kr/dota-core', '@ayu-sh-kr/dota-event'],

      output: {
        dir: 'dist',
        exports: 'named',
        globals: {
          '@ayu-sh-kr/dota-core': 'DotaCore',
          '@ayu-sh-kr/dota-event': 'DotaEvent'
        }
      }
    }
  },

  css: {
    postcss: './postcss.config.js'
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
    }),
    dotaWebTypeJson({
      root: resolve(import.meta.dirname),
      outFile: 'web-types.json',
      logType: 'info'
    }),
    eventMapGenerator({
      root: resolve(import.meta.dirname),
      outFile: 'src/event-map.d.ts',
      moduleSpecifier: '@ayu-sh-kr/dota-event',
      logType: 'info',
    }),
  ]
})
