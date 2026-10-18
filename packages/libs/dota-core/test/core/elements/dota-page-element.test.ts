import {afterEach, describe, expect, it} from "vitest";
import {Component, DotaPageElement, SEO_JSON_LD_ATTRIBUTE, updateDocumentSEO} from "@dota/core";
import {SEO} from "@dota/core/types";

class TestPageElement extends DotaPageElement {
  constructor() {
    super();
  }

  get seo(): SEO {
    return {
      title: "Page",
      description: "Metadata supplied by a page"
    };
  }

  render(): string {
    return "";
  }
}

Component({selector: "test-page-element"})(TestPageElement);
customElements.define("test-page-element", TestPageElement);

afterEach(() => {
  document.head.innerHTML = "";
});

describe("updateDocumentSEO", () => {
  it("keeps one managed JSON-LD script in sync and leaves authored scripts alone", () => {
    document.head.innerHTML = '<script type="application/ld+json">{"authored":true}</script>';

    updateDocumentSEO({title: "A", description: "", jsonLd: {"@type": "Article", headline: "A"}});
    updateDocumentSEO({title: "B", description: "", jsonLd: [{"@type": "WebPage"}]});
    const managed = () => document.head.querySelectorAll(`script[${SEO_JSON_LD_ATTRIBUTE}]`);

    expect(managed()).toHaveLength(1);
    expect(managed()[0].textContent).toBe('[{"@type":"WebPage"}]');
    updateDocumentSEO({title: "C", description: ""});
    expect(managed()).toHaveLength(0);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it("writes every supported SEO field to the document head", () => {
    updateDocumentSEO({
      title: "Dota",
      description: "A web component framework",
      keywords: [" dota ", "web components", ""],
      favicon: "/favicon.svg",
      canonical: "https://dota.example/",
      robots: "index,follow",
      og: {
        title: "Dota",
        description: "A framework",
        image: "/social.png",
        type: "website",
        url: "https://dota.example/",
        siteName: "Dota"
      },
      twitter: {
        card: "summary_large_image",
        title: "Dota",
        description: "A framework",
        image: "/social.png",
        site: "@dota",
        creator: "@ayu"
      }
    });

    expect(document.title).toBe("Dota");
    expect(document.head.querySelector('meta[name="keywords"]')?.getAttribute("content")).toBe("dota, web components");
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute("href")).toBe("/favicon.svg");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://dota.example/");
    expect(document.head.querySelector('meta[property="og:site_name"]')?.getAttribute("content")).toBe("Dota");
    expect(document.head.querySelector('meta[name="twitter:creator"]')?.getAttribute("content")).toBe("@ayu");
  });

  it("removes framework-owned tags omitted by the next page", () => {
    updateDocumentSEO({
      title: "First",
      description: "First page",
      keywords: "first",
      canonical: "https://dota.example/first",
      og: {
        title: "First"
      }
    });

    updateDocumentSEO({title: "Second", description: "Second page"});

    expect(document.head.querySelector('meta[name="keywords"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  it("updates SEO through the page element public API", () => {
    const page = document.createElement("test-page-element") as TestPageElement;
    page.updateSEO();

    expect(document.title).toBe("Page");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content"))
      .toBe("Metadata supplied by a page");
  });
});
