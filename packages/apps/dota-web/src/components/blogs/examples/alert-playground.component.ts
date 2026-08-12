import { BaseElement, BindEvent, Component, HTML } from "@ayu-sh-kr/dota-wrap/core";
import { Alert, type AlertController } from "@ayu-sh-kr/dota-ui";

type ShowcaseResult = { name: string; value: unknown };

/** Gives readers room to understand and try each alert before moving on. */
@Component({ selector: "alert-playground", shadow: false })
export class AlertPlaygroundComponent extends BaseElement {
  private result!: HTMLElement;

  constructor() {
    super();
  }

  render(): string {
    return HTML`
      <section class="not-prose overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50">
        <header class="border-b border-gray-200 px-6 py-8 dark:border-gray-700 sm:px-10 sm:py-10">
          <div class="max-w-2xl">
            <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-lime-700 dark:text-lime-300">try it yourself</p>
            <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See what each alert feels like.</h2>
            <p class="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">Pick an example below. A window will open, you can make a choice, and the result will appear at the bottom.</p>
          </div>
        </header>
        <div class="grid gap-8 p-6 sm:p-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-12">
          <div class="self-start lg:sticky lg:top-6">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">How to try it</p>
            <ol class="mt-5 space-y-5">
              <li class="flex gap-3"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-lime-100 font-mono text-xs text-lime-800 dark:bg-lime-900/40 dark:text-lime-200">1</span><span class="text-sm leading-6 text-gray-600 dark:text-gray-400">Choose an example that sounds useful to you.</span></li>
              <li class="flex gap-3"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-lime-100 font-mono text-xs text-lime-800 dark:bg-lime-900/40 dark:text-lime-200">2</span><span class="text-sm leading-6 text-gray-600 dark:text-gray-400">Make a choice, or close the window with <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">Esc</kbd>.</span></li>
              <li class="flex gap-3"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-lime-100 font-mono text-xs text-lime-800 dark:bg-lime-900/40 dark:text-lime-200">3</span><span class="text-sm leading-6 text-gray-600 dark:text-gray-400">Check the answer below the examples.</span></li>
            </ol>
            <p class="mt-8 border-t border-gray-200 pt-5 text-sm leading-6 text-gray-500 dark:border-gray-700 dark:text-gray-400">You can also use <kbd class="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">Tab</kbd> to move through each window.</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Choose an example</p>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              ${this.scenarioButton("01", "Show a message", "Tell someone that their draft is safe.", "dota-alert-note")}
              ${this.scenarioButton("02", "Ask first", "Give someone a chance to change their mind.", "dota-alert-ask")}
              ${this.scenarioButton("03", "Delete something", "Make a serious action clear and easy to stop.", "dota-alert-risk")}
              ${this.scenarioButton("04", "Ask for a name", "Check the answer before letting someone continue.", "dota-alert-prompt")}
              ${this.scenarioButton("05", "Wait for a save", "Keep the window open while work finishes.", "dota-alert-async")}
              ${this.scenarioButton("06", "Bring your own view", "Use your own buttons inside the window.", "dota-alert-custom-demo")}
            </div>
          </div>
        </div>
        <footer class="border-t border-gray-200 bg-gray-50/70 p-6 dark:border-gray-700 dark:bg-gray-900/60 sm:px-10 sm:py-7">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">What happened?</p>
            <span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-lime-700 dark:text-lime-300"><span class="size-1.5 rounded-full bg-lime-500"></span> ready</span>
          </div>
          <output id="alert-playground-result" class="mt-4 block min-h-16 rounded-xl border border-gray-200 bg-white p-4 font-mono text-xs leading-6 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400" aria-live="polite">Choose an example to see its answer here.</output>
        </footer>
      </section>
    `;
  }

  @BindEvent({ event: "click", id: "#dota-alert-note" })
  async openNote(): Promise<void> {
    const value = await Alert.note({
      title: "Your draft is saved",
      body: "You can return to it whenever you are ready.",
    });
    this.showResult({ name: "note", value });
  }

  @BindEvent({ event: "click", id: "#dota-alert-ask" })
  async openAsk(): Promise<void> {
    const value = await Alert.ask({
      title: "Publish this example?",
      body: "The preview will become visible to everyone with access.",
      confirm: "Publish",
    });
    this.showResult({ name: "ask", value });
  }

  @BindEvent({ event: "click", id: "#dota-alert-risk" })
  async openRisk(): Promise<void> {
    const value = await Alert.risk({
      title: "Delete this workspace?",
      body: "Saved examples cannot be recovered.",
      confirm: "Delete",
      cancel: "Keep it",
    });
    this.showResult({ name: "risk", value });
  }

  @BindEvent({ event: "click", id: "#dota-alert-prompt" })
  async openPrompt(): Promise<void> {
    const value = await Alert.prompt({
      title: "Name your experiment",
      body: "The guard accepts three or more characters.",
      field: {
        label: "Experiment name",
        hint: "3+ characters",
        placeholder: "Midnight lime",
        guard: (input) => input.trim().length >= 3,
      },
    });
    this.showResult({ name: "prompt", value });
  }

  @BindEvent({ event: "click", id: "#dota-alert-async" })
  async openAsync(): Promise<void> {
    const value = await Alert.ask({
      title: "Run the async check?",
      body: "The primary action waits for a simulated request.",
      confirm: "Run check",
      busy: "Checking…",
      onConfirm: async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        return "check-complete";
      },
    });
    this.showResult({ name: "async", value });
  }

  @BindEvent({ event: "click", id: "#dota-alert-custom-demo" })
  async openCustom(): Promise<void> {
    const value = await Alert.custom({
      ariaLabel: "Choose a sample accent",
      cancelValue: "cancelled",
      content: (controller) => this.createCustomContent(controller),
    });
    this.showResult({ name: "custom", value });
  }

  /** Builds the repeated example card while keeping labels and IDs in one place. */
  private scenarioButton(number: string, title: string, description: string, id: string): string {
    return `<button id="${id}" type="button" class="group flex min-h-32 flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-lime-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-lime-600"><span class="flex w-full items-center justify-between"><span class="grid size-8 place-items-center rounded-lg bg-lime-100 font-mono text-[10px] text-lime-800 dark:bg-lime-900/40 dark:text-lime-200">${number}</span><span class="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-lime-600">↗</span></span><span class="mt-5 block text-base font-medium">${title}</span><span class="mt-2 block text-sm leading-6 text-gray-500 dark:text-gray-400">${description}</span></button>`;
  }

  /** Creates caller-owned custom content to demonstrate the controller boundary. */
  private createCustomContent(controller: AlertController<string>): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "grid gap-4 p-6 sm:p-7";
    const title = document.createElement("h2");
    title.className = "text-lg font-semibold";
    title.textContent = "Choose a sample accent";
    const copy = document.createElement("p");
    copy.className = "text-sm text-gray-500";
    copy.textContent = "The caller owns this content; the host still owns its lifecycle.";
    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";
    for (const accent of ["lime", "rose", "sky"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-lime-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:bg-white dark:text-gray-900 dark:hover:bg-lime-200";
      button.textContent = accent;
      button.addEventListener("click", () => controller.resolve(accent));
      actions.append(button);
    }
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className =
      "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => controller.cancel());
    actions.append(cancel);
    panel.append(title, copy, actions);
    return panel;
  }

  /** Writes the latest promise result into the live output without re-rendering controls. */
  private showResult(result: ShowcaseResult): void {
    this.result ??= this.querySelector<HTMLElement>("#alert-playground-result")!;
    this.result.textContent = `${result.name} resolved → ${JSON.stringify(result.value)}`;
  }
}
