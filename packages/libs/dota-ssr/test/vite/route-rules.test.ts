// @vitest-environment node
import {staticPathsShadowedBy, wildcardRoutePatterns} from '@dota/vite/deployment/route-rules';
import {resolveSsgRoutes} from '@dota/ssg/route-output';

describe('wildcardRoutePatterns', () => {
  it('collapses nested routes into the wildcard that already covers them', () => {
    expect(wildcardRoutePatterns(['/tasks/:id/edit', '/tasks/:id', '/tasks/:id/comments/:comment'], '')).toEqual(['/tasks/*']);
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
