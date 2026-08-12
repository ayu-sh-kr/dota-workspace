import { BaseElement, BindEvent, Component, HostListener, HTML } from "@ayu-sh-kr/dota-core";
import { OnEvent } from "@ayu-sh-kr/dota-event";
import { ButtonStyle } from "@dota/components/button/button.config.ts";
import {
  Alert,
  type AlertController,
  type AlertCustomOptions,
  type AlertHost,
  type AlertTone,
  type BuiltInAlertOptions,
} from "@dota/components/alert/alert.service.ts";
import "./alert.css";

/** Lifecycle phases that control which user actions the host accepts. */
type AlertState = "closed" | "open" | "pending" | "closing";

/** Queued built-in request paired with the promise resolver that owns it. */
interface BuiltInJob {
  /** Identifies the standard shell rather than caller-owned content. */
  kind: "built-in";
  /** Copy, tone, field, and confirmation work rendered by the shell. */
  options: BuiltInAlertOptions<unknown, unknown>;
  /** Resolves only after the native dialog has completed its exit transition. */
  resolve: (value: unknown) => void;
}

/** Queued caller-owned content paired with its cancellation and result resolver. */
interface CustomJob {
  /** Identifies content rendered through the custom controller path. */
  kind: "custom";
  /** Content factory and dismissal policy supplied by the caller. */
  options: AlertCustomOptions<unknown>;
  /** Resolves only after the custom dialog has completed its exit transition. */
  resolve: (value: unknown) => void;
}

/** Union used by the queue so built-in and custom requests share one lifecycle. */
type AlertJob = BuiltInJob | CustomJob;

const GLYPHS: Record<AlertTone, string> = {
  note: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11.4v5"/><circle cx="12" cy="7.7" r="1.05"/></svg>`,
  ask: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.4a2.6 2.6 0 1 1 3.3 2.7c-.6.2-.9.7-.9 1.3v.5"/><circle cx="12" cy="16.4" r="1.05"/></svg>`,
  risk: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.4v5.2"/><circle cx="12" cy="16.5" r="1.05"/></svg>`,
};

const ALERT_BUTTON_BASE = `${ButtonStyle.base} ${ButtonStyle.size.md} ${ButtonStyle.rounded.lg} dota-alert__button`;

/**
 * Owns the single native dialog used by the public alert service.
 * Keeps requests serialized so focus, scroll locking, pending state, and exit
 * motion belong to one DOM session instead of being recreated per request.
 */
@Component({ selector: "dota-alert", shadow: false })
export class DotaAlertComponent extends BaseElement implements AlertHost {
  private dialog!: HTMLDialogElement;
  private activeJob: AlertJob | null = null;
  private readonly queue: AlertJob[] = [];
  private state: AlertState = "closed";
  private closeTimer: number | null = null;
  private savedPadding = "";

  constructor() {
    super();
  }

  @OnEvent("connected", true)
  /**
   * Captures the rendered dialog and registers this instance as the service host.
   * The native cancel event is attached directly because it does not bubble;
   * delegated child handlers remain managed by Dota's event decorators.
   */
  onConnected(): void {
    this.dialog = this.querySelector("#dota-alert-dialog")!;
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.cancel("escape");
    });
    Alert.connect(this);
  }

  @OnEvent("disconnected", true)
  /**
   * Releases browser resources and settles every outstanding request as cancelled.
   * Queued promises must not remain pending when the host leaves the document,
   * and scroll compensation must be restored before the instance is discarded.
   */
  onDisconnected(): void {
    if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
    this.dialog?.close();
    this.unlockScroll();
    Alert.disconnect(this);
    if (this.activeJob) this.activeJob.resolve(this.cancelValue(this.activeJob));
    for (const job of this.queue) job.resolve(this.cancelValue(job));
    this.queue.length = 0;
    this.activeJob = null;
    this.state = "closed";
  }

  /**
   * Admits a built-in request into the shared queue and returns its eventual answer.
   * The resolver is stored with the request so completion can wait for the exit
   * transition, preserving ordering when another request is already visible.
   * @param options Built-in copy, tone, optional prompt field, and confirmation work.
   * @returns The configured result, `false` for cancellation, or `null` for prompts.
   */
  openBuiltIn<TValue, TResult>(
    options: BuiltInAlertOptions<TValue, TResult>,
  ): Promise<TResult | TValue | false | null> {
    return new Promise((resolve) =>
      this.enqueue({
        kind: "built-in",
        options: options as BuiltInJob["options"],
        resolve: resolve as (value: unknown) => void,
      }),
    );
  }

  /**
   * Admits caller-owned content into the same serialized native dialog lifecycle.
   * The content is not mounted until its request reaches the front of the queue,
   * which keeps stale custom controllers from affecting a later request.
   * @param options Accessible name, content factory or node, cancellation value, and dismissal policy.
   * @returns A promise resolved with the custom controller's value.
   */
  openCustom<TResult>(options: AlertCustomOptions<TResult>): Promise<TResult> {
    return new Promise((resolve) =>
      this.enqueue({
        kind: "custom",
        options: options as AlertCustomOptions<unknown>,
        resolve: resolve as (value: unknown) => void,
      }),
    );
  }

  /**
   * Returns the stable dialog anatomy required by the state machine and ARIA wiring.
   * Runtime methods update these nodes instead of replacing them, so native focus,
   * modal state, and event bindings survive each queued request.
   * @returns The light-DOM dialog skeleton used by every alert request.
   */
  render(): string {
    return HTML`<dialog id="dota-alert-dialog" class="dota-alert__dialog">
      <form id="dota-alert-form" class="dota-alert__form" method="dialog">
        <section id="dota-alert-built-in">
          <div class="dota-alert__body"><div class="dota-alert__head"><span id="dota-alert-icon" class="dota-alert__icon" aria-hidden="true"></span><div><h2 id="dota-alert-title" class="dota-alert__title"></h2><p id="dota-alert-body" class="dota-alert__text"></p></div></div>
            <div id="dota-alert-field" class="dota-alert__field" hidden><div class="dota-alert__field-label"><label id="dota-alert-label" for="dota-alert-input"></label><span id="dota-alert-hint"></span></div><input id="dota-alert-input" class="dota-alert__input" type="text" autocomplete="off" /></div>
            <p id="dota-alert-built-in-error" class="dota-alert__error" role="alert" hidden></p>
          </div><footer class="dota-alert__footer"><button id="dota-alert-cancel" class="${ALERT_BUTTON_BASE} ${ButtonStyle.color.none.outline} dota-alert__button--ghost" type="button">Cancel</button><button id="dota-alert-confirm" class="${ALERT_BUTTON_BASE} ${ButtonStyle.color.lime.solid}" type="submit"><span id="dota-alert-confirm-label">Continue</span></button></footer>
        </section>
      </form><section id="dota-alert-custom" hidden><div id="dota-alert-custom-content"></div><p id="dota-alert-custom-error" class="dota-alert__error" role="alert" hidden></p></section>
    </dialog>`;
  }

  @BindEvent({ event: "submit", id: "#dota-alert-form" })
  /**
   * Routes form submission through the host instead of native immediate closing.
   * Preventing the default preserves prompt guards, pending confirmation work,
   * and the delayed resolver used by the exit transition.
   * @param event Native form submission raised by the primary action.
   */
  submit(event: SubmitEvent): void {
    event.preventDefault();
    void this.confirm();
  }

  @BindEvent({ event: "click", id: "#dota-alert-cancel" })
  /**
   * Treats the built-in safe action as an explicit cancellation request.
   * The cancellation policy is centralized so button, Escape, and scrim exits
   * cannot drift apart for risk or custom dialogs.
   */
  cancelButton(): void {
    this.cancel("explicit");
  }

  @BindEvent({ event: "input", id: "#dota-alert-input" })
  /**
   * Re-evaluates prompt validity after each user edit without rerendering the shell.
   * Keeping the input node alive preserves its value and caret while the primary
   * action reflects the caller's raw-value guard.
   */
  validate(): void {
    this.applyGuard();
  }

  @HostListener({ event: "click" })
  /**
   * Converts clicks outside the dialog rectangle into a scrim dismissal request.
   * Native dialog retargeting can report the dialog as the target for both inside
   * and outside clicks, so geometry decides whether the request is truly outside.
   * @param event Pointer position and target supplied by the host listener.
   */
  scrim(event: MouseEvent): void {
    if (event.target !== this.dialog) return;
    const box = this.dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
      this.cancel("scrim");
  }

  /**
   * Starts an idle request immediately and stores later requests in FIFO order.
   * A single admission point prevents built-in and custom content from sharing
   * the native dialog or overlapping their focus and scroll-lock lifecycles.
   * @param job Request plus resolver that must be completed by the state machine.
   */
  private enqueue(job: AlertJob): void {
    this.state === "closed" ? this.start(job) : this.queue.push(job);
  }

  /**
   * Publishes one request into the stable dialog and opens its modal session.
   * Content and ARIA attributes are prepared before `showModal`, while the next
   * animation frame gives the CSS enter state a reliable starting point.
   * @param job Front request selected by the queue.
   */
  private start(job: AlertJob): void {
    this.activeJob = job;
    this.state = "open";
    this.dialog.removeAttribute("data-pending");
    this.querySelectorAll<HTMLButtonElement>("button").forEach((button) => (button.disabled = false));
    const builtIn = this.querySelector<HTMLElement>("#dota-alert-built-in")!;
    const custom = this.querySelector<HTMLElement>("#dota-alert-custom")!;
    const errorNodes = this.querySelectorAll<HTMLElement>(".dota-alert__error");
    errorNodes.forEach((node) => {
      node.hidden = true;
      node.textContent = "";
    });
    builtIn.hidden = job.kind !== "built-in";
    custom.hidden = job.kind === "built-in";
    if (job.kind === "built-in") this.renderBuiltIn(job);
    else this.renderCustom(job);
    this.lockScroll();
    this.dialog.showModal();
    requestAnimationFrame(() => this.dialog.classList.add("is-open"));
    const target =
      job.kind === "custom"
        ? this.firstFocusable()
        : job.options.field
          ? this.querySelector<HTMLInputElement>("#dota-alert-input")
          : job.options.tone === "risk"
            ? this.querySelector<HTMLButtonElement>("#dota-alert-cancel")
            : this.querySelector<HTMLButtonElement>("#dota-alert-confirm");
    window.setTimeout(() => target?.focus({ preventScroll: true }), 30);
  }

  /**
   * Maps built-in options onto the shared shell and its tone-specific controls.
   * Prompt fields stay in this path because they belong to the predefined form;
   * caller-owned content is mounted separately by `renderCustom`.
   * @param job Built-in request currently owning the dialog.
   */
  private renderBuiltIn(job: BuiltInJob): void {
    const { options } = job;
    const field = options.field;
    const confirm = this.querySelector<HTMLElement>("#dota-alert-confirm")!;
    this.dialog.dataset.tone = options.tone;
    this.dialog.setAttribute("role", field ? "dialog" : "alertdialog");
    this.dialog.setAttribute("aria-labelledby", "dota-alert-title");
    if (options.body) this.dialog.setAttribute("aria-describedby", "dota-alert-body");
    else this.dialog.removeAttribute("aria-describedby");
    this.querySelector<HTMLElement>("#dota-alert-icon")!.innerHTML = GLYPHS[options.tone];
    this.querySelector<HTMLElement>("#dota-alert-title")!.textContent = options.title;
    this.querySelector<HTMLElement>("#dota-alert-body")!.textContent = options.body ?? "";
    const cancel = this.querySelector<HTMLButtonElement>("#dota-alert-cancel")!;
    cancel.hidden = options.tone === "note";
    cancel.textContent = options.cancel ?? "Cancel";
    const confirmColor = options.tone === "risk" ? ButtonStyle.color.rose.outline : ButtonStyle.color.lime.solid;
    confirm.className = `${ALERT_BUTTON_BASE} ${confirmColor} dota-alert__button--${options.tone}`;
    cancel.className = `${ALERT_BUTTON_BASE} ${ButtonStyle.color.none.outline} dota-alert__button--ghost`;
    this.querySelector("#dota-alert-confirm-label")!.textContent =
      options.confirm ?? (options.tone === "note" ? "Got it" : "Continue");
    const fieldNode = this.querySelector<HTMLElement>("#dota-alert-field")!;
    fieldNode.hidden = !field;
    if (field) {
      this.querySelector("#dota-alert-label")!.textContent = field.label;
      this.querySelector("#dota-alert-hint")!.textContent = field.hint ?? "";
      const input = this.querySelector<HTMLInputElement>("#dota-alert-input")!;
      input.value = field.value ?? "";
      input.placeholder = field.placeholder ?? "";
      this.applyGuard();
    }
  }

  /**
   * Mounts caller-owned content and binds a controller to the exact queued job.
   * Every controller operation checks identity and state so retained content
   * cannot resolve, cancel, or mutate a later request.
   * @param job Custom request currently owning the dialog.
   */
  private renderCustom(job: CustomJob): void {
    const controller: AlertController<unknown> = {
      resolve: (value) => this.activeJob === job && this.state === "open" && this.settle(value),
      cancel: () => this.activeJob === job && this.cancel("explicit"),
      run: (action) => this.run(job, action),
    };
    const content = typeof job.options.content === "function" ? job.options.content(controller) : job.options.content;
    this.dialog.removeAttribute("data-tone");
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-label", job.options.ariaLabel);
    this.querySelector("#dota-alert-custom-content")!.replaceChildren(content);
  }

  /**
   * Applies the active prompt guard to the primary action without changing focus.
   * The raw input is passed to the caller because exact-string guards are valid;
   * trimming is intentionally deferred until a successful confirmation settles.
   */
  private applyGuard(): void {
    const job = this.activeJob;
    if (this.state === "pending" || job?.kind !== "built-in" || !job.options.field) return;
    const guard = job.options.field.guard;
    this.querySelector<HTMLButtonElement>("#dota-alert-confirm")!.disabled =
      !!guard && !guard(this.querySelector<HTMLInputElement>("#dota-alert-input")!.value);
  }

  /**
   * Confirms a built-in request, optionally awaiting caller work under a pending lock.
   * Rejections restore the open state and expose a generic or caller-provided error
   * in the dialog so the user can correct the same request instead of reopening it.
   * @returns A promise used by the submit handler while async confirmation runs.
   */
  private async confirm(): Promise<void> {
    const job = this.activeJob;
    if (this.state !== "open" || job?.kind !== "built-in") return;
    const input = this.querySelector<HTMLInputElement>("#dota-alert-input")!;
    if (job.options.field?.guard && !job.options.field.guard(input.value)) return;
    const value = job.options.field ? input.value.trim() : true;
    if (!job.options.onConfirm) {
      this.settle(value);
      return;
    }
    this.setPending(true, job.options.busy ?? "Working");
    try {
      const result = await job.options.onConfirm(value);
      if (this.activeJob === job) this.settle(result === undefined ? value : result);
    } catch (error) {
      if (this.activeJob === job) {
        this.setPending(false);
        this.showError(error);
      }
    }
  }

  /**
   * Runs a custom controller action under the same pending and error policy as built-ins.
   * The job identity check makes late promises harmless after the dialog has settled
   * or moved on to another queued request.
   * @param job Custom request whose controller initiated the action.
   * @param action Caller-owned synchronous or asynchronous work to execute.
   */
  private async run(job: CustomJob, action: () => unknown | Promise<unknown>): Promise<void> {
    if (this.activeJob !== job || this.state !== "open") return;
    this.setPending(true);
    try {
      const result = await action();
      if (this.activeJob === job) this.settle(result);
    } catch (error) {
      if (this.activeJob === job) {
        this.setPending(false);
        this.showError(error);
      }
    }
  }

  /**
   * Reflects pending state in the machine, native controls, and dialog attributes.
   * Built-in controls are disabled together so confirmation work cannot be duplicated;
   * custom content remains visually owned by its caller while cancellation is blocked.
   * @param pending Whether the active request is waiting on caller work.
   * @param label Replacement primary label shown while pending.
   */
  private setPending(pending: boolean, label = "Working"): void {
    this.state = pending ? "pending" : "open";
    this.dialog.toggleAttribute("data-pending", pending);
    const buttons = this.querySelectorAll<HTMLButtonElement>("button");
    buttons.forEach((button) => (button.disabled = pending));
    if (pending) this.querySelector("#dota-alert-confirm-label")!.textContent = label;
  }

  /**
   * Applies dismissal rules before converting an exit request into settlement.
   * Risk scrims and non-dismissible custom requests are intentionally ignored, while
   * explicit controls remain available for every non-pending active request.
   * @param source Origin of the dismissal request used by the policy branches.
   */
  private cancel(source: "explicit" | "escape" | "scrim"): void {
    const job = this.activeJob;
    if (!job || this.state !== "open") return;
    if (source === "scrim" && job.kind === "built-in" && job.options.tone === "risk") return;
    if (source !== "explicit" && job.kind === "custom" && job.options.dismissible === false) return;
    this.settle(this.cancelValue(job));
  }

  /**
   * Begins the exit transition and resolves only after the native dialog closes.
   * Closing before draining the queue preserves focus return and prevents two modal
   * sessions from overlapping; reduced motion skips only the visual wait.
   * @param value Result delivered to the request's waiting caller.
   */
  private settle(value: unknown): void {
    const job = this.activeJob;
    if (!job || this.state === "closing") return;
    this.state = "closing";
    this.dialog.classList.remove("is-open");
    const finish = () => {
      this.closeTimer = null;
      this.dialog.close();
      this.unlockScroll();
      this.dialog.removeAttribute("data-pending");
      this.activeJob = null;
      this.state = "closed";
      job.resolve(value);
      const next = this.queue.shift();
      if (next) this.start(next);
    };
    this.closeTimer = window.setTimeout(
      finish,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 190,
    );
  }

  /**
   * Selects the cancellation sentinel required by the public request shape.
   * Built-in prompts follow `window.prompt` with `null`, other built-ins use `false`,
   * and custom content owns the value that its surrounding flow expects.
   * @param job Request whose public API determines the cancellation result.
   * @returns The cancellation value for the waiting caller.
   */
  private cancelValue(job: AlertJob): unknown {
    return job.kind === "custom" ? job.options.cancelValue : job.options.field ? null : false;
  }

  /**
   * Finds the first enabled control in caller-owned content for initial focus and errors.
   * The selector intentionally excludes disabled and negative-tabindex elements so custom
   * content receives a usable target without needing to know the surrounding dialog shell.
   * @returns First usable custom control, or `null` when content has none.
   */
  private firstFocusable(): HTMLElement | null {
    return this.querySelector<HTMLElement>(
      "#dota-alert-custom-content button:not([disabled]), #dota-alert-custom-content [href], #dota-alert-custom-content input:not([disabled]), #dota-alert-custom-content [tabindex]:not([tabindex='-1'])",
    );
  }

  /**
   * Writes a safe error message to the active request's live region.
   * Error objects may expose useful caller context; arbitrary rejected values are replaced
   * with stable copy so the dialog never renders an accidental object representation.
   * @param error Rejection or thrown value from built-in or custom caller work.
   */
  private showError(error: unknown): void {
    const node = this.querySelector<HTMLElement>(
      this.activeJob?.kind === "custom" ? "#dota-alert-custom-error" : "#dota-alert-built-in-error",
    )!;
    node.textContent = error instanceof Error && error.message ? error.message : "That did not work. Try again.";
    node.hidden = false;
  }

  /**
   * Prevents page movement and compensates for a removed scrollbar while modal.
   * Saving the previous inline-end padding lets this host coexist with another page
   * layout and gives `unlockScroll` an exact value to restore after closing.
   */
  private lockScroll(): void {
    const root = document.documentElement;
    this.savedPadding = root.style.paddingInlineEnd;
    const width = window.innerWidth - root.clientWidth;
    if (width > 0) root.style.paddingInlineEnd = `${width}px`;
    root.classList.add("dota-alert-lock");
  }

  /**
   * Restores the document scroll state captured when the active modal opened.
   * This is kept separate from native dialog closing because the queue starts its
   * next request only after the previous geometry has been restored.
   */
  private unlockScroll(): void {
    const root = document.documentElement;
    root.classList.remove("dota-alert-lock");
    root.style.paddingInlineEnd = this.savedPadding;
  }
}
