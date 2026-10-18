import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/main.ts'),
        'server/index': resolve(import.meta.dirname, 'src/server/index.ts')
      },
      formats: ['cjs', 'es'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    minify: false,
    rolldownOptions: {
      // The server entry imports the root by package name so both share one runtime copy and one set of types.
      external: ['consola', '@ayu-sh-kr/dota-rendering']
    }
  },
  resolve: {
    alias: {
      '@dota': resolve(import.meta.dirname, 'src')
    }
  },
  plugins: [
    // The root is one bundled declaration file, which Dota Wrap re-exports as `/rendering`.
    dts({insertTypesEntry: true, bundleTypes: true, exclude: ['src/server/**']}),
    // Server declarations stay unbundled and keep the package import, so they reuse the root's types.
    dts({include: ['src/server/**'], entryRoot: 'src', aliasesExclude: ['@ayu-sh-kr/dota-rendering']})
  ]
});
