// Playground server: Vite serves client modules, the Dota handler renders pages,
// and a small API answers the fetches components make during serverLoad.
// Run with `node playground/light-dom/server.mjs` after building dota-ssr.
import {createServer as createHttpServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequestHandler, createStringAdapter, toNodeListener} from '@ayu-sh-kr/dota-ssr/server';
import {createServer as createViteServer} from 'vite';

const root = import.meta.dirname;
const port = Number(process.env.PORT ?? 5180);
const tasks = [
  {id: 1, title: 'Design the adapter contract', done: true},
  {id: 2, title: 'Render <components> to strings', done: true},
  {id: 3, title: 'Add hydration markers', done: false}
];

// Linked workspace packages are inlined by default; externalizing them keeps one
// Dota Core instance, so components and the engine share the same metadata store.
const vite = await createViteServer({
  root,
  appType: 'custom',
  server: {middlewareMode: true},
  ssr: {external: ['@ayu-sh-kr/dota-core', '@ayu-sh-kr/dota-rendering', '@ayu-sh-kr/dota-ssr']}
});
const {COMPONENTS} = await vite.ssrLoadModule('/src/components.ts');
const template = await vite.transformIndexHtml('/', await readFile(`${root}/index.html`, 'utf8'));
const pages = toNodeListener(createRequestHandler({
  adapter: createStringAdapter({components: COMPONENTS}),
  routes: [{path: '/', page: 'tasks-page'}, {path: '/tasks', page: 'tasks-page'}],
  template
}));

vite.middlewares.use('/api/tasks', (_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(tasks));
});
vite.middlewares.use((request, response, next) => pages(request, response, next));

createHttpServer(vite.middlewares).listen(port, () => {
  console.log(`dota light-DOM SSR playground on http://localhost:${port}`);
});
