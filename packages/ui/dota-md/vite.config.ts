import {defineConfig} from "vite";
import {resolve} from "path";
import dts from 'vite-plugin-dts'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            name: 'dota-md',
            formats: ["es", "cjs"],
            fileName: (format) => `dota-md.${format === 'es' ? 'mjs' : 'cjs'}`
        },
        minify: false,

        rollupOptions: {
            external: ['@ayu-sh-kr/dota-core', '@ayu-sh-kr/dota-event'],

            output: {
                dir: 'dist',
                exports: 'named',
                globals: {
                    '@ayu-sh-kr/dota-core': 'DotaCore',
                    '@ayu-sh-kr/dota-event': 'DotaEvent'
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
        })
    ]
})