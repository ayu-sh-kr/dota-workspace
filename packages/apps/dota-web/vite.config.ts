import {defineConfig} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {dotaVitePlugins} from "@ayu-sh-kr/dota-wrap/vite";
import {blogPosts} from "./src/configs/blogs.config.ts";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const blogRoutes = blogPosts.map(post =>
  `/blogs/content/${encodeURIComponent(post.category)}/${encodeURIComponent(post.path)}`
);

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
    ...dotaVitePlugins({
      root: projectRoot,
      scanRoots: [
        projectRoot,
        resolve(projectRoot, '../../ui/dota-ui'),
        resolve(projectRoot, '../../ui/dota-md'),
      ],
      logType: 'info',
      eventMap: {
        outFile: 'src/event-map.d.ts',
      },
      webTypes: {
        outFile: 'web-types.json',
        customElementsManifest: {
          enabled: true,
          outFile: 'custom-elements.json',
          updatePackageJson: true,
        },
      },
      ssg: {
        entry: '/src/main.ts',
        autoDetectRoutes: true,
        routes: blogRoutes,
        vercel: true,
      },
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
