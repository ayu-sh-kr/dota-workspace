import {defineConfig} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import dotaVitePreloader from "@ayu-sh-kr/dota-wrap/preloader-plugin";
import dotaWebTypeJson from "@ayu-sh-kr/dota-wrap/web-type-json";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    dotaVitePreloader({
      root: projectRoot,
      logType: 'info'
    }),
    dotaWebTypeJson({
      root: projectRoot,
      scanRoots: [
        projectRoot,
        resolve(projectRoot, '../../ui/dota-ui'),
        resolve(projectRoot, '../../ui/dota-md'),
      ],
      outFile: 'web-types.json',
      logType: 'info',
      customElementsManifest: {
        enabled: true,
        outFile: 'custom-elements.json',
        updatePackageJson: true,
      },
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
