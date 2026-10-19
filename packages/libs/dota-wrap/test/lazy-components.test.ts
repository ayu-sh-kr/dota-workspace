import {describe, expect, it, vi} from "vitest";
import {defineComponentLoaders, LazyComponentLoader} from "../src/lazy-components";
import type {DotaElementConstructor} from "@ayu-sh-kr/dota-core";

let sequence = 0;

/**
 * Creates a loader for a fresh element class with a unique tag, since tags cannot be redefined.
 * @param name Readable tag suffix.
 * @returns The unique tag and a spy loader that resolves its constructor.
 */
function element(name: string) {
  const tag = `lazy-${name}-${++sequence}`;
  const constructor = class extends HTMLElement {
    static __dotaSelector = tag;
  } as unknown as DotaElementConstructor;
  return {tag, loader: vi.fn(async () => constructor)};
}

describe("LazyComponentLoader", () => {
  it("defines a tag and its dependency closure in one pass", async () => {
    const page = element("page");
    const header = element("header");
    const icon = element("icon");
    const unused = element("unused");
    const loader = new LazyComponentLoader([defineComponentLoaders(
      {[page.tag]: page.loader, [header.tag]: header.loader, [icon.tag]: icon.loader, [unused.tag]: unused.loader},
      {[page.tag]: [header.tag, "not-registered"], [header.tag]: [icon.tag]}
    )]);

    expect(loader.closure([page.tag])).toEqual([page.tag, header.tag, icon.tag]);
    await loader.ensure([page.tag]);

    expect([page.tag, header.tag, icon.tag].every(tag => customElements.get(tag))).toBe(true);
    expect(customElements.get(unused.tag)).toBeUndefined();
    expect(unused.loader).not.toHaveBeenCalled();
  });

  it("shares a load between concurrent calls and skips defined tags", async () => {
    const page = element("shared");
    const loader = new LazyComponentLoader([{loaders: {[page.tag]: page.loader}}]);

    await Promise.all([loader.ensure([page.tag]), loader.ensure([page.tag])]);
    await loader.ensure([page.tag]);

    expect(page.loader).toHaveBeenCalledTimes(1);
  });

  it("retries a loader that failed", async () => {
    const page = element("flaky");
    const constructor = await page.loader();
    page.loader.mockClear();
    page.loader.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(constructor);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = new LazyComponentLoader([{loaders: {[page.tag]: page.loader}}]);

    await loader.ensure([page.tag]);
    expect(customElements.get(page.tag)).toBeUndefined();
    await loader.ensure([page.tag]);

    expect(customElements.get(page.tag)).toBeDefined();
  });

  it("defines registry elements that enter the document later", async () => {
    const toast = element("toast");
    const loader = new LazyComponentLoader([{loaders: {[toast.tag]: toast.loader}}]);
    const stop = loader.observe(document.body);

    document.body.append(document.createElement("div"));
    document.body.lastElementChild!.innerHTML = `<${toast.tag}></${toast.tag}>`;
    await vi.waitFor(() => expect(customElements.get(toast.tag)).toBeDefined());
    stop();
  });

  it("resolves every component for server rendering without defining them", async () => {
    const page = element("server");
    const loader = new LazyComponentLoader([{loaders: {[page.tag]: page.loader}}]);

    expect(await loader.loadAll()).toHaveLength(1);
    expect(customElements.get(page.tag)).toBeUndefined();
  });
});
