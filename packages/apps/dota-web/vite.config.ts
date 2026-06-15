import {defineConfig} from "vite";
import {resolve} from "path";
import dotaVitePreloader from "@ayu-sh-kr/dota-preloader-plugin";

export default defineConfig({
  plugins: [
    dotaVitePreloader({
      root: resolve(__dirname),
      logType: 'debug'
    })
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