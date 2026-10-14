import {RestClient} from "@ayu-sh-kr/dota-wrap/rest";

import {routerService} from "@dota/main.ts";


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

  /** Loads the Markdown for a documentation page from `public/docs/<slug>.md`. */
  async loadDoc(slug: string): Promise<string> {
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