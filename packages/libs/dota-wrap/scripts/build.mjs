import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import dts from 'vite-plugin-dts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const internalPackages = [
  '@ayu-sh-kr/dota-core',
  '@ayu-sh-kr/dota-event',
  '@ayu-sh-kr/dota-event-map-generator',
  '@ayu-sh-kr/dota-preloader-plugin',
  '@ayu-sh-kr/dota-rest',
  '@ayu-sh-kr/dota-router',
  '@ayu-sh-kr/dota-web-type-json',
];

const nodePluginExternal = [
  /^node:.*/,
  'fs',
  'path',
  'url',
  '@swc/core',
  'consola',
  'fast-glob',
  'vite',
];

const entries = [
  { name: '.', source: 'src/index.ts', outDir: 'dist' },
  { name: 'core', source: 'src/core/index.ts', outDir: 'dist/core' },
  { name: 'event', source: 'src/event/index.ts', outDir: 'dist/event' },
  { name: 'event-map-generator', source: 'src/event-map-generator/index.ts', outDir: 'dist/event-map-generator', bundleInternal: true, external: nodePluginExternal },
  { name: 'router', source: 'src/router/index.ts', outDir: 'dist/router' },
  { name: 'rest', source: 'src/rest/index.ts', outDir: 'dist/rest' },
  {
    name: 'preloader-plugin',
    source: 'src/preloader-plugin/index.ts',
    outDir: 'dist/preloader-plugin',
    bundleInternal: true,
    external: nodePluginExternal,
  },
  {
    name: 'web-type-json',
    source: 'src/web-type-json/index.ts',
    outDir: 'dist/web-type-json',
    bundleInternal: true,
    external: nodePluginExternal,
  },
];

function getExternal(entry) {
  if (entry.bundleInternal) return entry.external ?? [];
  return [...internalPackages, ...(entry.external ?? [])];
}

const declarationSources = {
  core: '../dota-core/dist/index.d.ts',
  event: '../dota-event/dist/index.d.ts',
  'event-map-generator': '../../plugins/event-map-generator/dist/index.d.ts',
  router: '../dota-router/dist/index.d.ts',
  rest: '../dota-rest/dist/index.d.ts',
  'preloader-plugin': '../../plugins/dota-vite-preloader/dist/index.d.ts',
  'web-type-json': '../../plugins/web-type-json/dist/index.d.ts',
};

await rm(resolve(packageRoot, 'dist'), { force: true, recursive: true });

for (const entry of entries) {
  const outDir = resolve(packageRoot, entry.outDir);

  await build({
    configFile: false,
    root: packageRoot,
    oxc: {
      decorator: {
        legacy: true,
      },
    },
    build: {
      emptyOutDir: false,
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
      lib: {
        entry: resolve(packageRoot, entry.source),
        formats: ['cjs', 'es'],
        fileName: (format) => format === 'es' ? 'index.mjs' : 'index.cjs',
      },
      minify: false,
      outDir,
      rolldownOptions: {
        // Keep stateful browser runtimes as package references so every subpath
        // resolves one core/event instance. Build-time plugins stay bundled so a
        // packed wrapper contains the exact scanner implementation it was built with.
        external: getExternal(entry),
      },
    },
    resolve: {
      alias: {
        '@dota': resolve(packageRoot, 'src'),
      },
    },
    plugins: [
      dts({
        outDir,
        entryRoot: dirname(resolve(packageRoot, entry.source)),
        insertTypesEntry: true,
      }),
    ],
  });

  console.info(`built ${entry.name} -> ${entry.outDir}`);
}

for (const [name, source] of Object.entries(declarationSources)) {
  const destinationDir = resolve(packageRoot, 'dist', name);
  const destination = resolve(destinationDir, 'index.d.ts');
  let content = await readFile(resolve(packageRoot, source), 'utf8');

  if (name === 'core') {
    content = content.replaceAll(
      "from '@ayu-sh-kr/dota-event'",
      "from '../event/index'"
    );
  }

  await mkdir(destinationDir, { recursive: true });
  await writeFile(destination, content);
}

const rootDeclaration = resolve(packageRoot, 'dist/index.d.ts');
const rootContent = await readFile(rootDeclaration, 'utf8');
await writeFile(
  rootDeclaration,
  rootContent
    .replaceAll("from '@ayu-sh-kr/dota-core'", "from './core/index'")
    .replaceAll("from '@ayu-sh-kr/dota-router'", "from './router/index'")
);
