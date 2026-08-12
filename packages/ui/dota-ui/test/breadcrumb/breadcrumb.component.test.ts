import {describe, expect, it, vi} from "vitest";
import {BreadcrumbComponent, BreadcrumbMachine, normalizeBreadcrumbItems, partitionBreadcrumb} from "@dota/components/breadcrumb/breadcrumb.component.ts";

if (!customElements.get("dota-breadcrumb-test")) customElements.define("dota-breadcrumb-test", BreadcrumbComponent);

describe("BreadcrumbMachine", () => {
  it("normalizes blank labels and duplicate identities", () => {
    const items = normalizeBreadcrumbItems([
      {label: "  Home ", href: "/"},
      {label: "", href: "/ignored"},
      {label: "Docs", id: "same"},
      {label: "API", id: "same"},
    ]);

    expect(items.map(item => item.id)).toEqual(["/", "same", "same~"]);
    expect(items[0].label).toBe("Home");
    expect(items[2].isCurrent).toBe(true);
  });

  it("keeps both ends and folds only meaningful middle sections", () => {
    const items = normalizeBreadcrumbItems([
      {label: "Home"}, {label: "Docs"}, {label: "Guide"}, {label: "API"}, {label: "Current"},
    ]);

    const partition = partitionBreadcrumb(items, 3, 2);
    expect(partition.visible.map(item => item.label)).toEqual(["Home", "API", "Current"]);
    expect(partition.folded.map(item => item.label)).toEqual(["Docs", "Guide"]);
    expect(partitionBreadcrumb(items.slice(0, 3), 2, 2).folded).toHaveLength(0);
  });

  it("settles locally without a router listener and ignores current navigation", () => {
    const machine = new BreadcrumbMachine([{label: "Home", href: "/"}, {label: "Current"}]);

    expect(machine.go("Current").depth).toBe(2);
    expect(machine.go("/").crumbs.map(item => item.label)).toEqual(["Home"]);
  });

  it("retains a failed target and retries it through the listener boundary", () => {
    const machine = new BreadcrumbMachine([{label: "Home"}, {label: "Current"}]);
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);

    machine.go("home");
    expect(machine.get().busy).toBe(true);
    machine.fail("Router unavailable");
    expect(machine.get().error).toBe("Router unavailable");
    machine.retry();
    expect(machine.get().busy).toBe(true);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("supports path replacement, fitting, fold commands, and stale settlement", () => {
    const machine = new BreadcrumbMachine([
      {label: "Home"}, {label: "Docs"}, {label: "Guide"}, {label: "Current"},
    ], 2);

    expect(machine.openFold().foldOpen).toBe(true);
    expect(machine.toggleFold().foldOpen).toBe(false);
    expect(machine.closeFold().foldOpen).toBe(false);
    expect(machine.fit(null).isFolded).toBe(false);
    machine.set([
      {label: "Home"}, {label: "Docs"}, {label: "Current"},
    ]);
    machine.subscribe(() => undefined);
    const revision = machine.go("docs").revision;
    expect(machine.settle(revision - 1).busy).toBe(true);
    expect(machine.settle(revision).crumbs.map(item => item.label)).toEqual(["Home", "Docs"]);
  });
});

describe("BreadcrumbComponent", () => {
  it("renders semantic links, current state, escaping, and complete slot overrides", () => {
    const element = document.createElement("dota-breadcrumb-test") as BreadcrumbComponent;
    element.path = [{label: "Home", href: "/"}, {label: "<Current>"}];
    element.config = {container: "custom-container", crumb: "custom-crumb", current: "custom-current"};

    element.innerHTML = element.render();

    expect(element.querySelector("nav")?.getAttribute("aria-label")).toBe("Breadcrumb");
    expect(element.querySelector(".custom-container")).not.toBeNull();
    expect(element.querySelector("a.custom-crumb")?.getAttribute("href")).toBe("/");
    expect(element.querySelector(".custom-current")?.textContent).toBe("<Current>");
    expect(element.querySelector(".custom-current")?.getAttribute("title")).toBe("<Current>");
  });

  it("renders a fold control and its menu when the machine is open", () => {
    const element = document.createElement("dota-breadcrumb-test") as BreadcrumbComponent;
    element.path = [{label: "Home"}, {label: "Docs"}, {label: "Guide"}, {label: "Current"}];
    element.budget = 2;
    element.machine = new BreadcrumbMachine(element.path, element.budget);
    element.machine.openFold();
    element.innerHTML = element.render();

    expect(element.querySelector("dota-popover[anchored-selector]")).not.toBeNull();
    expect(element.querySelector("[data-breadcrumb-fold]")?.getAttribute("aria-expanded")).toBeNull();
    expect(element.querySelectorAll("[data-breadcrumb-id]")).toHaveLength(3);
    expect(element.querySelector('[role="list"]')?.children[1].querySelector("[data-breadcrumb-fold]")).not.toBeNull();
    expect(element.querySelector(".sr-only")).not.toBeNull();
  });

  it("allows consumers to replace separator and fold icon names", () => {
    const element = document.createElement("dota-breadcrumb-test") as BreadcrumbComponent;
    element.path = [{label: "Home"}, {label: "Docs"}, {label: "Guide"}, {label: "Current"}];
    element.budget = 2;
    element.config = {
      separatorIcon: "lucide:slash",
      foldIcon: "material-symbols:more-horiz",
    };
    element.innerHTML = element.render();

    expect(element.querySelector('dota-icon[name="lucide:slash"]')).not.toBeNull();
    expect(element.querySelector('dota-icon[name="material-symbols:more-horiz"]')).not.toBeNull();
  });
});
