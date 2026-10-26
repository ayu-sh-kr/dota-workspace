import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

/** Ids that let a host update the file name and bind its copy action. */
export interface CodeHeaderIds {
  /** Id of the copy button. */
  copy: string;
  /** Optional id of the file name, for hosts that swap files in place. */
  filename?: string;
}

/**
 * Header row of a code panel: the file name and an icon-only copy action, drawn on the
 * panel surface without a bar, border, or window controls.
 *
 * @param filename File name shown on the left.
 * @param ids Element ids for the copy button and, optionally, the file name.
 */
export function codeHeader(filename: string, ids: CodeHeaderIds): TemplateResult {
  const name = ids.filename
    ? html`<span id="${ids.filename}" class="code-filename">${filename}</span>`
    : html`<span class="code-filename">${filename}</span>`;
  return html`
    <div class="code-header">
      ${name}
      <button id="${ids.copy}" type="button" class="code-copy"
              aria-label="Copy code to clipboard" title="Copy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2"/>
          <path d="M5 15V6a2 2 0 0 1 2-2h9"/>
        </svg>
      </button>
    </div>
  `;
}
