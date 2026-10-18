import {defineConfig} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {dotaVitePlugins} from "@ayu-sh-kr/dota-wrap/vite";
import {blogPosts} from "./src/configs/blogs.config.ts";
import {DOCS, docUrl} from "./src/configs/docs.config.ts";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const blogRoutes = blogPosts.map(post =>
  `/blogs/content/${encodeURIComponent(post.category)}/${encodeURIComponent(post.path)}`
);
const docRoutes = DOCS.map(doc => docUrl(doc.slug));
// Hosting target for SSG and SSR output; `DOTA_DEPLOYMENT=node` builds a local Node server.
const deployment = (process.env.DOTA_DEPLOYMENT ?? 'vercel') as 'vercel' | 'node';
// Parameterized pages to prerender. Blog articles render per request (`mode: 'ssr'`);
// the render-mode benchmark (tool-scripts/render-mode-benchmark) sets DOTA_BENCH_VARIANT
// to prerender every page (`ssg`) or none (`ssr`, `csr`).
const prerenderedPages = {
  mixed: docRoutes,
  ssg: [...blogRoutes, ...docRoutes],
  ssr: [],
  csr: [],
}[process.env.DOTA_BENCH_VARIANT ?? 'mixed'] ?? docRoutes;

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
      deployment,
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
        concurrency: 1,
        entry: '/src/main.ts',
        autoDetectRoutes: true,
        routes: prerenderedPages,
        deployment: deployment === 'node' ? false : deployment,
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
