import {defineConfig} from "vite";
import {resolve} from "path";
import dts from 'vite-plugin-dts'
import dotaWebTypeJson from "@ayu-sh-kr/dota-web-type-json";
import eventMapGenerator from "@ayu-sh-kr/dota-event-map-generator";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'dota-ui',
      formats: ["es", "cjs"],
      fileName: (format) => `dota-ui.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    minify: false,

    rollupOptions: {
      external: ['@ayu-sh-kr/dota-core'],
      input: {
        main: resolve(__dirname, 'src/index.ts')
      },

      output: {
        dir: 'dist',
        exports: 'named',
        globals: {
          '@ayu-sh-kr/dota-core': 'DotaCore'
        }
      }
    }
  },

  css: {
    postcss: './postcss.config.js'
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
    }),
    dotaWebTypeJson({
      root: resolve(__dirname),
      outFile: 'web-types.json',
      logType: 'info'
    }),
    eventMapGenerator({
      root: resolve(__dirname),
      outFile: 'src/event-map.d.ts',
      moduleSpecifier: '@ayu-sh-kr/dota-event',
      logType: 'info',
    }),
  ]
})
