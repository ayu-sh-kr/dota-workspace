import {RestClient} from "@ayu-sh-kr/dota-wrap/rest";
import renderingGuide from "../../../../../documentation/packages/libs/dota-ssr/architecture/branch-changes-guide.md?raw";

import {routerService} from "@dota/main.ts";

// Eager imports keep article text available before SSG's readiness barrier resolves.
const renderingLessons = import.meta.glob<string>(
  '../../../../../documentation/packages/libs/dota-ssr/architecture/learning/*.md',
  {query: '?raw', import: 'default', eager: true},
);
const renderingDiagrams = import.meta.glob<string>(
  '../../../../../documentation/packages/libs/dota-ssr/architecture/learning/*.svg',
  {query: '?raw', import: 'default', eager: true},
);

export class DocLoaderService {

  restClient: RestClient;

  constructor() {
    this.restClient = RestClient.builder()
      .timeout(10000)
      .handler((response) => {
        if(!response.ok) {
          routerService.route('/error')
        }
      })
      .build();
  }

  /**
   * Loads the SSR collection and file reference from their canonical package documentation.
   * Embeds trusted repository SVGs so static pages do not retain Vite dev asset URLs.
   * Resolves repository links for the website; other docs use public Markdown.
   * @param slug Documentation URL segment used to select its content source.
   */
  async loadDoc(slug: string): Promise<string> {
    const lesson = Object.entries(renderingLessons).find(([path]) => path.endsWith(`/${slug}.md`))?.[1];
    if (lesson || slug === 'ssr-file-reference') {
      const content = (lesson ?? renderingGuide).replace(/!\[[^\]]*\]\(\.\/([a-z-]+\.svg)\)/g, (image, name: string) => {
        const diagram = Object.entries(renderingDiagrams).find(([path]) => path.endsWith(`/${name}`))?.[1];
        return diagram ? `<figure>${diagram.replaceAll('\n', '')}</figure>` : image;
      });
      return content.replaceAll('](../../../../../../', '](https://github.com/ayu-sh-kr/dota-workspace/blob/feat/light-dom-ssr/')
        .replaceAll('](../../../../../', '](https://github.com/ayu-sh-kr/dota-workspace/blob/feat/light-dom-ssr/');
    }

    const response = await this.restClient.get()
      .uri(`/docs/${slug}.md`)
      .retrieve()
      .toResponse();

    return response.text();
  }

  async loadResource(path: string): Promise<string> {
    const response = await this.restClient.get()
      .uri(`/materials/${path}`)
      .retrieve()
      .toResponse();

    return response.text();
  }

  async loadBlog(path: string): Promise<string> {
    const response = await this.restClient.get()
      .uri(`/blogs/${path}`)
      .retrieve()
      .toResponse();

    return response.text();
  }
}
