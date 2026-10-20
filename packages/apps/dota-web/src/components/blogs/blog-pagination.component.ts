import {BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {applicationEventPublisher} from "@dota/main.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, keyed, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

export const BLOG_PAGINATION_CHANGE_EVENT = "blog:pagination:changed";
export const BLOG_PAGINATION_STORAGE_KEY = "dota-web:blogs:pagination";
export const BLOG_PAGE_SIZE_OPTIONS = [3, 6, 9] as const;

export type BlogPaginationState = {
  currentPage: number;
  pageSize: number;
};

export const DEFAULT_PAGINATION_STATE: BlogPaginationState = {
  currentPage: 1,
  pageSize: 6,
};

const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(Math.max(value, minimum), maximum);
};

const toPositiveInteger = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const readStoredValue = (): Partial<BlogPaginationState> => {
  try {
    const storedValue = LocalStorageService.get(BLOG_PAGINATION_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) as Partial<BlogPaginationState> : {};
  } catch {
    return {};
  }
};

export const readBlogPaginationState = (totalItems: number): BlogPaginationState => {
  const stored = readStoredValue();
  const requestedPageSize = toPositiveInteger(stored.pageSize);
  const pageSize = BLOG_PAGE_SIZE_OPTIONS.includes(requestedPageSize as typeof BLOG_PAGE_SIZE_OPTIONS[number])
    ? requestedPageSize!
    : DEFAULT_PAGINATION_STATE.pageSize;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
  const currentPage = clamp(toPositiveInteger(stored.currentPage) ?? DEFAULT_PAGINATION_STATE.currentPage, 1, totalPages);

  return {currentPage, pageSize};
};

export const persistBlogPaginationState = (state: BlogPaginationState, totalItems: number): BlogPaginationState => {
  const pageSize = BLOG_PAGE_SIZE_OPTIONS.includes(state.pageSize as typeof BLOG_PAGE_SIZE_OPTIONS[number])
    ? state.pageSize
    : DEFAULT_PAGINATION_STATE.pageSize;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
  const normalizedState = {
    currentPage: clamp(state.currentPage, 1, totalPages),
    pageSize,
  };

  try {
    LocalStorageService.add(BLOG_PAGINATION_STORAGE_KEY, JSON.stringify(normalizedState));
  } catch {
    // Keep pagination usable when browser storage is unavailable.
  }

  return normalizedState;
};

@Component({
  selector: "blog-pagination",
  shadow: false,
})
export class BlogPaginationComponent extends BaseElement {

  @Property({name: "total", type: String})
  total: string = "0";

  /** Rendered state; starts at the default so prerendered and hydrated output agree. */
  private state: BlogPaginationState = DEFAULT_PAGINATION_STATE;

  constructor() {
    super();
  }

  /** Applies the reader's stored page after hydration has adopted the default first page. */
  @OnEvent("connected", true)
  restoreState() {
    this.state = readBlogPaginationState(this.totalItems);
    this.updateHTML();
  }

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-pagination-action]");
    if (!button || button.getAttribute("aria-disabled") === "true") {
      return;
    }

    const totalPages = this.totalPages;
    const currentState = this.state;
    const action = button.dataset.paginationAction;
    const requestedPage = action === "first"
      ? 1
      : action === "previous"
        ? currentState.currentPage - 1
        : action === "next"
          ? currentState.currentPage + 1
          : action === "last"
            ? totalPages
            : toPositiveInteger(button.dataset.page) ?? currentState.currentPage;

    this.setState({...currentState, currentPage: requestedPage});
  }

  @HostListener({event: "change"})
  handlePageSizeChange(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "blog-page-size") {
      return;
    }

    this.setState({
      currentPage: 1,
      pageSize: toPositiveInteger(target.value) ?? DEFAULT_PAGINATION_STATE.pageSize,
    });
  }

  private get totalItems(): number {
    return Math.max(0, toPositiveInteger(this.total) ?? 0);
  }

  private get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.state.pageSize));
  }

  private setState(state: BlogPaginationState) {
    this.state = persistBlogPaginationState(state, this.totalItems);
    applicationEventPublisher.publish({
      name: BLOG_PAGINATION_CHANGE_EVENT,
      data: this.state,
    });
    this.updateHTML();
  }

  private getPageItems(totalPages: number, currentPage: number): Array<number | "ellipsis"> {
    if (totalPages <= 7) {
      return Array.from({length: totalPages}, (_, index) => index + 1);
    }

    const items: Array<number | "ellipsis"> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      items.push("ellipsis");
    }

    for (let page = start; page <= end; page += 1) {
      items.push(page);
    }

    if (end < totalPages - 1) {
      items.push("ellipsis");
    }

    items.push(totalPages);
    return items;
  }

  render(): TemplateResult {
    const state = this.state;
    const totalPages = this.totalPages;
    const startItem = this.totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
    const endItem = Math.min(state.currentPage * state.pageSize, this.totalItems);
    const pageItems = this.getPageItems(totalPages, state.currentPage);

    return html`
      <nav aria-label="Blog pagination"
           class="mt-10 flex flex-col gap-4 border-t border-default pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="type-compact text-muted tabular-nums" aria-live="polite">
          Showing <span class="font-semibold text-foreground">${startItem}–${endItem}</span>
          of <span class="font-semibold text-foreground">${this.totalItems}</span> posts
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <label for="blog-page-size" class="sr-only">Posts per page</label>
          <select id="blog-page-size"
                  class="field type-compact min-h-10 py-1"
                  aria-label="Posts per page">
            ${keyed(BLOG_PAGE_SIZE_OPTIONS, pageSize => pageSize, pageSize => state.pageSize === pageSize
              ? html`<option value="${pageSize}" selected>${pageSize} per page</option>`
              : html`<option value="${pageSize}">${pageSize} per page</option>`)}
          </select>

          <div class="flex items-center gap-1" aria-label="Pagination controls">
            ${this.renderActionButton("first", "First page", "«", state.currentPage === 1)}
            ${this.renderActionButton("previous", "Previous page", "‹", state.currentPage === 1)}
            ${keyed(pageItems, (item, index) => item === "ellipsis" ? `ellipsis-${index}` : item, item => item === "ellipsis"
              ? html`<span aria-hidden="true" class="grid size-10 place-items-center text-muted">…</span>`
              : this.renderPageButton(item, state.currentPage))}
            ${this.renderActionButton("next", "Next page", "›", state.currentPage === totalPages)}
            ${this.renderActionButton("last", "Last page", "»", state.currentPage === totalPages)}
          </div>
        </div>
      </nav>
    `;
  }

  /**
   * Builds a first/previous/next/last control. Unavailable actions stay focusable but are
   * marked with `aria-disabled`, which the click handler and styles both respect.
   */
  private renderActionButton(action: string, label: string, icon: string, disabled: boolean): TemplateResult {
    return html`
      <button type="button" data-pagination-action="${action}" aria-label="${label}" aria-disabled="${disabled}"
              class="grid size-10 place-items-center rounded-full text-lg text-muted transition-colors
                     hover:bg-raised hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-35">
        <span aria-hidden="true">${icon}</span>
      </button>
    `;
  }

  private renderPageButton(page: number, currentPage: number): TemplateResult {
    const isCurrent = page === currentPage;
    return html`
      <button type="button" data-pagination-action="page" data-page="${page}" aria-current="${isCurrent ? "page" : "false"}"
              aria-label="Page ${page}"
              class="type-compact grid size-10 place-items-center rounded-full font-semibold tabular-nums transition-colors
                     ${isCurrent
                       ? "bg-[var(--action-primary-background)] text-[var(--action-primary-foreground)]"
                       : "text-muted hover:bg-raised hover:text-foreground"}">
        ${page}
      </button>
    `;
  }
}
