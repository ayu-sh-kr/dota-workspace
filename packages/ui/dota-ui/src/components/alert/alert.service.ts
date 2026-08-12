/**
 * Selects the visual and dismissal policy for a built-in alert request.
 * The service maps these values to the acknowledgement, confirmation, and
 * destructive-confirmation entry points consumed by the mounted alert host.
 */
export type AlertTone = "note" | "ask" | "risk";

/**
 * Describes the copy and optional confirmation work for a built-in alert.
 * The host uses the generic input value for `onConfirm` and resolves the
 * request with its result, or with that value when the callback returns void.
 */
export interface AlertOptions<TValue = true, TResult = TValue> {
  /** Heading announced when the dialog opens and used as its accessible name. */
  title: string;
  /** Optional supporting context shown beneath the heading and announced by the dialog. */
  body?: string;
  /** Optional label for the primary action; the tone supplies a default when absent. */
  confirm?: string;
  /** Optional label for the safe-exit action; cancellation keeps its public sentinel. */
  cancel?: string;
  /** Optional label shown while `onConfirm` is pending and all dialog controls are locked. */
  busy?: string;
  /** Work performed after confirmation; its result, or the input value for void, resolves the request. */
  onConfirm?: (value: TValue) => TResult | Promise<TResult>;
}

/**
 * Configures the single text field used by the prompt flow.
 * The host validates the raw input while editing and trims it only after a
 * successful confirmation, preserving exact-value validation semantics.
 */
export interface AlertFieldOptions {
  /** Visible label associated with the input and its accessible name. */
  label: string;
  /** Optional constraint hint shown beside the label. */
  hint?: string;
  /** Optional placeholder displayed before the caller enters a value. */
  placeholder?: string;
  /** Optional initial value placed in the input before the request becomes active. */
  value?: string;
  /** Optional guard applied to raw input; a false result disables and rejects confirmation. */
  guard?: (value: string) => boolean;
}

/**
 * Combines built-in alert copy with one guarded text field.
 * It narrows the tone to prompt-compatible values and uses `null` as the
 * cancellation result, matching the behavior callers expect from `prompt`.
 */
export interface AlertPromptOptions<TResult = string> extends AlertOptions<string, TResult> {
  /** Field rendered below the prompt copy; its value becomes the confirmation input. */
  field: AlertFieldOptions;
  /** Prompt tone; defaults to `ask` when omitted and may still use risk dismissal rules. */
  tone?: "ask" | "risk";
}

/**
 * Controls exposed to caller-owned content mounted inside the shared dialog.
 * Each operation is scoped to the request that created the controller, so
 * retained content cannot settle or mutate a later queued request.
 */
export interface AlertController<TResult> {
  /** Resolves the active custom request with a result and starts its exit transition. */
  resolve(value: TResult): void;
  /** Cancels the active custom request with its configured cancellation value. */
  cancel(): void;
  /** Runs work under the dialog’s pending lock and returns failures to its live error region. */
  run(action: () => TResult | Promise<TResult>): Promise<void>;
}

/**
 * Supplies caller-owned content and dismissal policy for a custom alert.
 * The host mounts the content only when its queued request becomes active and
 * resolves cancellation with the caller-provided value rather than a sentinel.
 */
export interface AlertCustomOptions<TResult> {
  /** Accessible name used when custom content has no visible heading. */
  ariaLabel: string;
  /** Existing content or a factory that receives the active request controller. */
  content: HTMLElement | ((controller: AlertController<TResult>) => HTMLElement);
  /** Value returned when Escape, scrim, or explicit cancellation dismisses the request. */
  cancelValue: TResult;
  /** Whether Escape and scrim dismissal are allowed; defaults to `true`, while explicit cancel remains allowed. */
  dismissible?: boolean;
}

/**
 * Adapter implemented by the one mounted `dota-alert` host.
 * The service depends on this narrow contract so application code can enqueue
 * alerts without depending on the component’s rendering or queue internals.
 */
export interface AlertHost {
  /** Queues a built-in alert and resolves after its close transition. */
  openBuiltIn<TValue, TResult>(options: BuiltInAlertOptions<TValue, TResult>): Promise<TResult | TValue | false | null>;
  /** Queues caller-owned content and resolves after its close transition. */
  openCustom<TResult>(options: AlertCustomOptions<TResult>): Promise<TResult>;
}

/**
 * Normalized request passed from the service to the built-in host flow.
 * The required tone selects the shell policy, while `field` turns the same
 * request into a guarded prompt without changing the host queue contract.
 */
export type BuiltInAlertOptions<TValue, TResult> = AlertOptions<TValue, TResult> & {
  /** Tone-specific visual and dismissal policy selected by the service entry point. */
  tone: AlertTone;
  /** Optional field that changes the built-in dialog into a prompt. */
  field?: AlertFieldOptions;
};

/**
 * Public facade for opening queued, accessible alerts from application code.
 * It forwards requests to the currently mounted host and exposes stable
 * cancellation/result types for built-in, prompt, and custom workflows.
 */
export class AlertService {
  private host: AlertHost | null = null;

  /**
   * Registers the active host so subsequent requests can reach the shared dialog.
   * @param host Component instance that owns the alert dialog and request queue.
   */
  connect(host: AlertHost): void {
    this.host = host;
  }

  /**
   * Clears the host only when the disconnecting instance is still registered.
   * The identity check prevents an older component from unregistering a newer
   * host during replacement or reconnect cycles.
   * @param host Component instance leaving the document.
   */
  disconnect(host: AlertHost): void {
    if (this.host === host) {
      this.host = null;
    }
  }

  /**
   * Opens an acknowledgement dialog without confirmation callbacks or cancel controls.
   * @param options Required title and optional body/action copy for the notice.
   * @returns `true` after acknowledgement, or `false` when it is dismissed.
   */
  note(options: Omit<AlertOptions<true, true>, "cancel" | "busy" | "onConfirm">): Promise<true | false> {
    return this.requireHost().openBuiltIn({ ...options, tone: "note" }) as Promise<true | false>;
  }

  /**
   * Opens a reversible confirmation and optionally runs confirmation work.
   * @param options Confirmation copy and callback receiving the acknowledgement value.
   * @returns Callback result, `true` when no callback supplies a result, or `false` on cancel.
   */
  ask<TResult = true>(options: AlertOptions<true, TResult>): Promise<TResult | true | false> {
    return this.requireHost().openBuiltIn({ ...options, tone: "ask" }) as Promise<TResult | true | false>;
  }

  /**
   * Opens a destructive confirmation that refuses scrim cancellation.
   * @param options Confirmation copy and optional callback for the risky action.
   * @returns Callback result, `true` when no callback supplies a result, or `false` on cancel.
   */
  risk<TResult = true>(options: AlertOptions<true, TResult>): Promise<TResult | true | false> {
    return this.requireHost().openBuiltIn({ ...options, tone: "risk" }) as Promise<TResult | true | false>;
  }

  /**
   * Opens a guarded text prompt; cancellation resolves to `null`, like `window.prompt`.
   * @param options Prompt copy, field configuration, and optional result callback.
   * @returns Callback result, entered text, or `null` when the prompt is cancelled.
   */
  prompt<TResult = string>(options: AlertPromptOptions<TResult>): Promise<TResult | string | null> {
    return this.requireHost().openBuiltIn({ ...options, tone: options.tone ?? "ask" }) as Promise<
      TResult | string | null
    >;
  }

  /**
   * Opens caller-owned content under the shared queue and dismissal lifecycle.
   * @param options Custom content, accessible name, cancellation value, and dismissal policy.
   * @returns The value supplied through the custom controller or cancellation policy.
   */
  custom<TResult>(options: AlertCustomOptions<TResult>): Promise<TResult> {
    return this.requireHost().openCustom(options);
  }

  /**
   * Resolves the mounted host required to service a request.
   * Fails synchronously so callers discover an unmounted `<dota-alert>` before
   * creating a promise that could never be displayed.
   * @returns The currently registered alert host.
   * @throws Error when no alert host has been connected.
   */
  private requireHost(): AlertHost {
    if (!this.host) {
      throw new Error("Alert is not ready. Mount <dota-alert> before opening an alert.");
    }

    return this.host;
  }
}

/** Shared alert facade used by downstream applications after `<dota-alert>` mounts. */
export const Alert = new AlertService();
