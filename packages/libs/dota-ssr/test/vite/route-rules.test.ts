// @vitest-environment node
import {
  isVercelCatchAll,
  redirectsCatchAlls,
  shellRoutePaths,
  staticPathsShadowedBy,
  toRedirectsSource,
  toVercelSource,
  wildcardRoutePatterns,
  withSlashForms
} from '@dota/vite/deployment/route-rules';
import {resolveSsgRoutes} from '@dota/ssg/route-output';

describe('wildcardRoutePatterns', () => {
  it('collapses nested routes into the wildcard that already covers them', () => {
    expect(wildcardRoutePatterns(['/tasks/:id/edit', '/tasks/:id', '/tasks/:id/comments/:comment'], '')).toEqual(['/tasks/*']);
  });

  it('collapses a nested dynamic route under its parent route, whichever comes first', () => {
    expect(wildcardRoutePatterns(['/products/:product', '/products/:product/playground'], '')).toEqual(['/products/*']);
    expect(wildcardRoutePatterns(['/products/:product/playground', '/products/[product]'], '')).toEqual(['/products/*']);
    expect(wildcardRoutePatterns(['/docs/[...slug]', '/docs/:slug/edit'], '')).toEqual(['/docs/*']);
  });

  it('keeps patterns that only partly overlap, and drops duplicates', () => {
    expect(wildcardRoutePatterns(['/a/:x/b', '/a/c/:y', '/users/:id', '/users/:name', '/'], '/base')).toEqual(['/base/a/*/b', '/base/a/c/*', '/base/users/*', '/base/']);
  });

  it('treats other pattern characters literally', () => {
    expect(wildcardRoutePatterns(['/v1.0/:id', '/v1x0/:id'], '')).toEqual(['/v1.0/*', '/v1x0/*']);
  });
});

describe('staticPathsShadowedBy', () => {
  it('lists both slash forms of prerendered pages a server route matches', () => {
    const pages = resolveSsgRoutes(['/', '/tasks/42', '/tasks/42/edit', '/about']);

    expect(staticPathsShadowedBy(['/tasks/:id', '/'], pages, '/base')).toEqual(['/base/', '/base/tasks/42', '/base/tasks/42/']);
  });

  it('lists nothing without prerendered pages', () => {
    expect(staticPathsShadowedBy(['/tasks/:id'], [], '')).toEqual([]);
  });
});

describe('shell routes', () => {
  it('drops the root and prerendered pages, and adds slash forms', () => {
    const paths = shellRoutePaths(['/', '/about', '/docs/intro', '/users/:id'], resolveSsgRoutes(['/docs/intro']));

    expect(paths).toEqual(['/about', '/users/:id']);
    expect(withSlashForms(['/', ...paths, '/docs/[...slug]'])).toEqual(['/', '/about', '/users/:id', '/docs/[...slug]', '/about/', '/users/:id/']);
  });
});

describe('host source syntax', () => {
  it('converts bracket segments for _redirects and Vercel', () => {
    expect(toRedirectsSource('/users/[id]/files/[...path]')).toBe('/users/:id/files/*');
    expect(toVercelSource('/users/[id]/files/[...path]')).toBe('/users/:id/files/:path+');
    expect(toVercelSource('/tasks/:id')).toBe('/tasks/:id');
  });

  it('finds catch-all fallbacks', () => {
    expect(['/(.*)', '/:path*', '/:path(.*)', '/api/(.*)', '/:id'].map(isVercelCatchAll)).toEqual([true, true, true, false, false]);
    expect(redirectsCatchAlls('/old /new 301\n/* /index.html 200\n/app/* /x 200\n/* /gone 404', '')).toEqual(['/* /index.html 200']);
  });
});
