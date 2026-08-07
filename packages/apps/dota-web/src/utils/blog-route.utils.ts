/** Identifies the category and Markdown file selected by a blog route. */
export type BlogRouteParams = {
  /** Blog category matching the public content directory. */
  category: string;
  /** Markdown filename, including its `.md` suffix when supplied. */
  blog: string;
};

/**
 * Resolves blog identity from the path-based article URL used by SSG.
 * Query parameters remain supported so older links continue to load while
 * generated pages use one deterministic pathname per article.
 * @param pathname Current browser pathname.
 * @param search Current browser query string used by legacy links.
 * @returns Decoded category and Markdown filename, or empty values when absent.
 */
export function resolveBlogRouteParams(pathname: string, search: string): BlogRouteParams {
  const segments = pathname.split('/').filter(Boolean);
  const isBlogContentPath = segments[0] === 'blogs' && segments[1] === 'content';
  if (isBlogContentPath && segments.length >= 4) {
    return {
      category: decodeRouteSegment(segments[2]),
      blog: segments.slice(3).map(decodeRouteSegment).join('/')
    };
  }

  const query = new URLSearchParams(search);
  return {
    category: query.get('category') ?? '',
    blog: query.get('blog') ?? ''
  };
}

/** Decodes one URL segment while preserving malformed user input for fallback handling. */
function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
