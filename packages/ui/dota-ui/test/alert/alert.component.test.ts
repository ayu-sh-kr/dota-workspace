import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DotaAlertComponent } from "@dota/components/alert/alert.component.ts";

if (!customElements.get("dota-alert-test")) customElements.define("dota-alert-test", DotaAlertComponent);

const flushPromises = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("DotaAlertComponent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores mouse controls and scrim dismissal after an async alert closes", async () => {
    const alert = document.createElement("dota-alert-test") as DotaAlertComponent;
    alert.innerHTML = alert.render();
    document.body.append(alert);
    alert.onConnected();

    let resolveSave!: (value: string) => void;
    const save = new Promise<string>((resolve) => {
      resolveSave = resolve;
    });
    const firstResult = alert.openBuiltIn({
      tone: "ask",
      title: "Save changes?",
      onConfirm: () => save,
    });
    let firstValue: unknown;
    void firstResult.then((value) => (firstValue = value));

    alert.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    await flushPromises();

    const confirm = alert.querySelector<HTMLButtonElement>("#dota-alert-confirm")!;
    expect(confirm.disabled).toBe(true);
    expect(alert.querySelector("#dota-alert-dialog")!.hasAttribute("data-pending")).toBe(true);

    resolveSave("saved");
    await flushPromises();
    await flushPromises();
    vi.runOnlyPendingTimers();
    await flushPromises();
    expect(firstValue).toBe("saved");

    const secondResult = alert.openBuiltIn({ tone: "note", title: "Saved" });
    let secondValue: unknown;
    void secondResult.then((value) => (secondValue = value));
    expect(confirm.disabled).toBe(false);
    expect(alert.querySelector("#dota-alert-dialog")!.hasAttribute("data-pending")).toBe(false);

    alert.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    await flushPromises();
    vi.runOnlyPendingTimers();
    await flushPromises();
    expect(secondValue).toBe(true);

    const thirdResult = alert.openBuiltIn({ tone: "ask", title: "Continue?" });
    let thirdValue: unknown;
    void thirdResult.then((value) => (thirdValue = value));
    const dialog = alert.querySelector<HTMLDialogElement>("#dota-alert-dialog")!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
    } as DOMRect);
    Object.defineProperty(dialog, "open", { value: true, configurable: true });

    const outsideClick = new MouseEvent("click", { clientX: 20, clientY: 20 });
    Object.defineProperty(outsideClick, "target", { value: dialog });
    alert.scrim(outsideClick);
    vi.runOnlyPendingTimers();
    await flushPromises();
    expect(thirdValue).toBe(false);
  });
});
