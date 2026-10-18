import {copyFile} from "node:fs/promises";
import {defineConfig, type Plugin} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {dotaVitePlugins} from "@ayu-sh-kr/dota-wrap/vite";
import {blogPosts} from "./src/configs/blogs.config.ts";
import {DOCS, docUrl} from "./src/configs/docs.config.ts";
import {iconAssets} from './build/icons/icon-assets.plugin.ts';

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const blogRoutes = blogPosts.map(post =>
  `/blogs/content/${encodeURIComponent(post.category)}/${encodeURIComponent(post.path)}`
);
// Hosting target for SSG and SSR output; `DOTA_DEPLOYMENT=node` builds a local Node server.
const deployment = (process.env.DOTA_DEPLOYMENT ?? 'vercel') as 'vercel' | 'node';
// Parameterized pages to prerender. The benchmark can also prerender documentation
// pages in its all-SSG variant; the regular build leaves them to SSR.
const prerenderedPages = {
  mixed: blogRoutes,
  ssg: [...blogRoutes, ...DOCS.map(doc => docUrl(doc.slug))],
  ssr: [],
  csr: [],
}[process.env.DOTA_BENCH_VARIANT ?? 'mixed'] ?? blogRoutes;

/** Keeps an unrendered HTML entry for browser-only routes after SSG replaces index.html. */
function spaFallback(): Plugin {
  let outputDirectory: string;
  let isServerBuild: boolean;

  return {
    name: 'dota-web-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
      isServerBuild = Boolean(config.build.ssr);
    },
    async writeBundle() {
      if (!isServerBuild) {
        await copyFile(resolve(outputDirectory, 'index.html'), resolve(outputDirectory, 'spa.html'));
      }
    },
  };
}

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
    iconAssets(),
    spaFallback(),
    ...dotaVitePlugins({
      root: projectRoot,
      scanRoots: [
        projectRoot,
        resolve(projectRoot, '../../ui/dota-ui'),
        resolve(projectRoot, '../../ui/dota-md'),
      ],
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
