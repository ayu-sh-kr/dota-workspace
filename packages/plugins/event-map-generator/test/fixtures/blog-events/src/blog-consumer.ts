import {OnEvent} from '@ayu-sh-kr/dota-wrap/event';
import {
  BLOG_ARTICLE_DATA_EVENT,
  BLOG_ARTICLE_ERROR_EVENT,
  BLOG_INDEX_DATA_EVENT,
  BLOG_MARKDOWN_SOURCE_EVENT,
  type BlogArticleData,
  type BlogIndexData,
} from '@dota/blog-events.ts';

type ApplicationEvent<Name extends string> = {
  name: Name;
  data: unknown;
};

declare const blogPosts: string[];
declare const post: string;
declare const nextPost: string | null;
declare const markdownSource: string;
declare const error: Error;

declare const publisher: {
  publishAsync(event: {name: string; data?: unknown}): Promise<void>;
};

export class BlogConsumer {
  @OnEvent(BLOG_INDEX_DATA_EVENT)
  onBlogData(event: ApplicationEvent<typeof BLOG_INDEX_DATA_EVENT>): void {
    void event;
  }

  @OnEvent(BLOG_ARTICLE_DATA_EVENT)
  onArticleData(event: ApplicationEvent<typeof BLOG_ARTICLE_DATA_EVENT>): void {
    void event;
  }

  @OnEvent(BLOG_ARTICLE_ERROR_EVENT)
  onArticleError(event: ApplicationEvent<typeof BLOG_ARTICLE_ERROR_EVENT>): void {
    void event;
  }

  @OnEvent(BLOG_MARKDOWN_SOURCE_EVENT)
  onMarkdownSource(event: ApplicationEvent<typeof BLOG_MARKDOWN_SOURCE_EVENT>): void {
    void event;
  }

  publishBlogEvents(): void {
    void publisher.publishAsync({
      name: BLOG_INDEX_DATA_EVENT,
      data: {posts: blogPosts} satisfies BlogIndexData,
    });
    void publisher.publishAsync({
      name: BLOG_ARTICLE_DATA_EVENT,
      data: {post, nextPost} satisfies BlogArticleData,
    });
    void publisher.publishAsync({
      name: BLOG_ARTICLE_ERROR_EVENT,
      data: {error},
    });
    void publisher.publishAsync({
      name: BLOG_MARKDOWN_SOURCE_EVENT,
      data: {source: markdownSource},
    });
  }
}
