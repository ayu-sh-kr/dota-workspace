import {defineConfig} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import dotaVitePreloader from "@ayu-sh-kr/dota-wrap/preloader-plugin";
import eventMapGenerator from "@ayu-sh-kr/dota-wrap/event-map-generator";
import dotaWebTypeJson from "@ayu-sh-kr/dota-wrap/web-type-json";
import dotaSsg from "@ayu-sh-kr/dota-ssr/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
    },
  },
  build: {
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
  },
  plugins: [
    dotaVitePreloader({
      root: projectRoot,
      logType: 'info'
    }),
    eventMapGenerator({
      root: projectRoot,
      scanRoots: [
        projectRoot,
        resolve(projectRoot, '../../ui/dota-ui'),
        resolve(projectRoot, '../../ui/dota-md'),
      ],
      outFile: 'src/event-map.d.ts',
      moduleSpecifier: '@ayu-sh-kr/dota-wrap/event',
      logType: 'info',
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
    dotaSsg({
      root: projectRoot,
      entry: '/src/main.ts',
      autoDetectRoutes: true,
      logType: 'info',
      vercel: true,
    }),
  ],
  css: {
    postcss: 'postcss.config.js'
  },
  resolve: {
    alias: {
      '@dota': resolve(projectRoot, 'src')
    }
  },
  publicDir: 'public',
})
