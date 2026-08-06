import {resolveDecoratedSsgRoutes, resolveSsgRoutes} from '@dota/vite/route-output';

describe('resolveSsgRoutes', () => {
  it('normalizes paths, outputs, and ordering deterministically', () => {
    expect(resolveSsgRoutes([
      '/docs/',
      '/',
      {path: '/community', output: './pages/community.html'},
      {path: '//guides///start/'}
    ])).toEqual([
      {path: '/', output: 'index.html'},
      {path: '/community', output: 'pages/community.html'},
      {path: '/docs', output: 'docs/index.html'},
      {path: '/guides/start', output: 'guides/start/index.html'}
    ]);
  });

  it.each(['/docs?draft=true', '/docs#intro', 'docs'])(
    'rejects a route path with unsupported URL state: %s',
    (path) => {
      expect(() => resolveSsgRoutes([path])).toThrow(`SSG route must be an absolute pathname: ${path}`);
    }
  );

  it.each(['/docs.html', '../docs.html', '..', 'docs.txt'])(
    'rejects an output outside the build directory or without an HTML extension: %s',
    (output) => {
      expect(() => resolveSsgRoutes([{path: '/docs', output}])).toThrow('SSG output must be a relative HTML file');
    }
  );

  it('rejects route aliases and output collisions after normalization', () => {
    expect(() => resolveSsgRoutes(['/docs', '/docs/'])).toThrow('Duplicate SSG route: /docs');
    expect(() => resolveSsgRoutes([
      {path: '/docs', output: 'pages/shared.html'},
      {path: '/guides', output: 'pages/shared.html'}
    ])).toThrow('Duplicate SSG output: pages/shared.html');
  });
});

describe('resolveDecoratedSsgRoutes', () => {
  it('includes only opted-in static metadata and lets explicit routes replace the same path', () => {
    expect(resolveDecoratedSsgRoutes([
      {path: '/', ssr: true},
      {path: '/blogs', ssr: true},
      {path: '/chat'},
      {path: '/projects/:id', ssr: false}
    ], [{path: '/blogs', output: 'pages/blogs.html'}])).toEqual([
      {path: '/', output: 'index.html'},
      {path: '/blogs', output: 'pages/blogs.html'}
    ]);
  });

  it('rejects an opted-in dynamic decorated route before generating output', () => {
    expect(() => resolveDecoratedSsgRoutes([{path: '/projects/:id', ssr: true}])).toThrow(
      'Decorated SSG route must be concrete: /projects/:id'
    );
  });

  it('preserves duplicate detection for decorated route metadata', () => {
    expect(() => resolveDecoratedSsgRoutes([
      {path: '/blogs', ssr: true},
      {path: '/blogs/', ssr: true}
    ])).toThrow('Duplicate SSG route: /blogs');
  });
});
