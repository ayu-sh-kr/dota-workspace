import {defineConfig} from "vite";
import {resolve} from "path";
import dotaVitePreloader from "@ayu-sh-kr/dota-wrap/preloader-plugin";
import dotaWebTypeJson from "@ayu-sh-kr/dota-wrap/web-type-json";

export default defineConfig({
  plugins: [
    dotaVitePreloader({
      root: resolve(__dirname),
      logType: 'info'
    }),
    dotaWebTypeJson({
      root: resolve(__dirname),
      scanRoots: [
        resolve(__dirname),
        resolve(__dirname, '../../ui/dota-ui'),
        resolve(__dirname, '../../ui/dota-md'),
      ],
      outFile: 'web-types.json',
      logType: 'info'
    }),
  ],
  css: {
    postcss: 'postcss.config.js'
  },
  resolve: {
    alias: {
      '@dota': resolve('./src')
    }
  },
  publicDir: 'public',
})
