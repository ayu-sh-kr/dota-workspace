import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertService, type AlertHost } from "@dota/components/alert/alert.service.ts";

describe("AlertService", () => {
  let service: AlertService;
  let openBuiltIn: ReturnType<typeof vi.fn>;
  let openCustom: ReturnType<typeof vi.fn>;
  let host: AlertHost;

  beforeEach(() => {
    service = new AlertService();
    openBuiltIn = vi.fn();
    openCustom = vi.fn();
    host = {
      openBuiltIn: openBuiltIn as AlertHost["openBuiltIn"],
      openCustom: openCustom as AlertHost["openCustom"],
    };
  });

  it("fails clearly when note is requested before the host connects", () => {
    expect(() => service.note({ title: "Ready?" })).toThrow("Mount <dota-alert>");
    expect(openBuiltIn).not.toHaveBeenCalled();
  });

  it("forwards note options with the note tone", async () => {
    openBuiltIn.mockResolvedValue(true);
    service.connect(host);

    const result = await service.note({ title: "Saved", body: "Draft stored." });

    expect(result).toBe(true);
    expect(openBuiltIn).toHaveBeenCalledWith({ title: "Saved", body: "Draft stored.", tone: "note" });
  });

  it("forwards ask options and preserves a custom result", async () => {
    openBuiltIn.mockResolvedValue("published");
    service.connect(host);

    const result = await service.ask({ title: "Publish?", confirm: "Publish", onConfirm: () => "published" });

    expect(result).toBe("published");
    expect(openBuiltIn).toHaveBeenCalledWith(expect.objectContaining({ tone: "ask", title: "Publish?" }));
  });

  it("forwards risk options with its destructive tone", async () => {
    openBuiltIn.mockResolvedValue(false);
    service.connect(host);

    const result = await service.risk({ title: "Delete?", cancel: "Keep it" });

    expect(result).toBe(false);
    expect(openBuiltIn).toHaveBeenCalledWith({ title: "Delete?", cancel: "Keep it", tone: "risk" });
  });

  it("defaults prompts to ask and preserves their field contract", async () => {
    openBuiltIn.mockResolvedValue("lime");
    service.connect(host);
    const field = { label: "Name", guard: (value: string) => value.length > 2 };

    const result = await service.prompt({ title: "Name it", field });

    expect(result).toBe("lime");
    expect(openBuiltIn).toHaveBeenCalledWith({ title: "Name it", field, tone: "ask" });
  });

  it("preserves an explicitly destructive prompt tone", async () => {
    openBuiltIn.mockResolvedValue(null);
    service.connect(host);
    const options = { title: "Type DELETE", field: { label: "Confirmation" }, tone: "risk" as const };

    await service.prompt(options);

    expect(openBuiltIn).toHaveBeenCalledWith({ ...options, tone: "risk" });
  });

  it("forwards custom content and returns its host result", async () => {
    openCustom.mockResolvedValue("lime");
    service.connect(host);
    const options = { ariaLabel: "Accent", cancelValue: "cancelled", content: document.createElement("div") };

    const result = await service.custom(options);

    expect(result).toBe("lime");
    expect(openCustom).toHaveBeenCalledWith(options);
  });

  it("does not clear a replacement host when an older host disconnects", async () => {
    const replacement = { ...host, openBuiltIn: vi.fn() as AlertHost["openBuiltIn"] };
    replacement.openBuiltIn = vi.fn().mockResolvedValue(true) as AlertHost["openBuiltIn"];
    service.connect(host);
    service.connect(replacement);
    service.disconnect(host);

    await service.note({ title: "Still connected" });

    expect(replacement.openBuiltIn).toHaveBeenCalled();
  });

  it("throws after the active host disconnects", () => {
    service.connect(host);
    service.disconnect(host);

    expect(() =>
      service.custom({ ariaLabel: "Custom", cancelValue: false, content: document.createElement("div") }),
    ).toThrow("Mount <dota-alert>");
  });
});
