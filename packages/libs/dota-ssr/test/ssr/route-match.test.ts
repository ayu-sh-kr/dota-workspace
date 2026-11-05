// @vitest-environment node
import {matchPath, toWildcardPattern} from '@dota/ssr/route-match';

describe('matchPath', () => {
  const routes = [
    {path: '/products/:product'},
    {path: '/products/:product/playground'},
    {path: '/docs/[...slug]'},
    {path: '/users/[id]'}
  ];

  it('matches Dota Router segment syntax, ignoring trailing slashes', () => {
    expect(matchPath(routes, '/products/kit/playground/')).toEqual({route: routes[1], params: {product: 'kit'}});
    expect(matchPath(routes, '/docs/guide/intro')).toEqual({route: routes[2], params: {slug: 'guide/intro'}});
    expect(matchPath(routes, '/users/a%20b')).toEqual({route: routes[3], params: {id: 'a b'}});
  });

  it('rejects parents with no route, extra segments, and an empty catch-all', () => {
    expect(matchPath(routes, '/products')).toBeUndefined();
    expect(matchPath(routes, '/products/kit/other')).toBeUndefined();
    expect(matchPath(routes, '/docs')).toBeUndefined();
  });

  it('keeps a malformed escape as written instead of throwing', () => {
    expect(matchPath(routes, '/users/%E0%A4')?.params).toEqual({id: '%E0%A4'});
  });
});

describe('toWildcardPattern', () => {
  it('replaces every dynamic segment with a wildcard', () => {
    expect(toWildcardPattern('/products/:product/playground')).toBe('/products/*/playground');
    expect(toWildcardPattern('/docs/[...slug]')).toBe('/docs/*');
    expect(toWildcardPattern('/users/[id]')).toBe('/users/*');
  });
});
