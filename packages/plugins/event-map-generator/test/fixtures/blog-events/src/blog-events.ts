export const BLOG_INDEX_DATA_EVENT = 'blog:index-data';
export const BLOG_ARTICLE_DATA_EVENT = 'blog:article-data';
export const BLOG_ARTICLE_ERROR_EVENT = 'blog:article-error';
export const BLOG_MARKDOWN_SOURCE_EVENT = 'blog:markdown-source';

export type BlogIndexData = {
  posts: string[];
};

export type BlogArticleData = {
  post: string;
  nextPost: string | null;
};
