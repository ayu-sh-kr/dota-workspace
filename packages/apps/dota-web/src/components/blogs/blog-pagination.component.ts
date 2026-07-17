import {BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {applicationEventPublisher} from "@dota/main.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

export const BLOG_PAGINATION_CHANGE_EVENT = "blog:pagination:changed";
export const BLOG_PAGINATION_STORAGE_KEY = "dota-web:blogs:pagination";
export const BLOG_PAGE_SIZE_OPTIONS = [3, 6, 9] as const;

export type BlogPaginationState = {
  currentPage: number;
  pageSize: number;
};

const DEFAULT_PAGINATION_STATE: BlogPaginationState = {
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

  constructor() {
    super();
  }

  @HostListener({event: "click"})
  handleClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-pagination-action]");
    if (!button || button.disabled) {
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

  private get state(): BlogPaginationState {
    return readBlogPaginationState(this.totalItems);
  }

  private setState(state: BlogPaginationState) {
    const persistedState = persistBlogPaginationState(state, this.totalItems);
    applicationEventPublisher.publish({
      name: BLOG_PAGINATION_CHANGE_EVENT,
      data: persistedState,
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

  render(): string {
    const state = this.state;
    const totalPages = this.totalPages;
    const startItem = this.totalItems === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
    const endItem = Math.min(state.currentPage * state.pageSize, this.totalItems);
    const pageItems = this.getPageItems(totalPages, state.currentPage);

    return `
      <nav aria-label="Blog pagination"
           class="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm
                  dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          Showing <span class="font-semibold text-slate-950 dark:text-white">${startItem}–${endItem}</span>
          of <span class="font-semibold text-slate-950 dark:text-white">${this.totalItems}</span> posts
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <label for="blog-page-size" class="sr-only">Posts per page</label>
          <select id="blog-page-size"
                  class="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700
                         outline-none transition focus-visible:ring-2 focus-visible:ring-purple-500
                         dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
                  aria-label="Posts per page">
            ${BLOG_PAGE_SIZE_OPTIONS.map(pageSize => `
              <option value="${pageSize}" ${state.pageSize === pageSize ? "selected" : ""}>${pageSize} per page</option>
            `).join("")}
          </select>

          <div class="flex items-center gap-1" aria-label="Pagination controls">
            ${this.renderActionButton("first", "First page", "«", state.currentPage === 1)}
            ${this.renderActionButton("previous", "Previous page", "‹", state.currentPage === 1)}
            ${pageItems.map(item => item === "ellipsis"
              ? `<span aria-hidden="true" class="grid size-10 place-items-center text-slate-400 dark:text-slate-500">…</span>`
              : this.renderPageButton(item, state.currentPage)).join("")}
            ${this.renderActionButton("next", "Next page", "›", state.currentPage === totalPages)}
            ${this.renderActionButton("last", "Last page", "»", state.currentPage === totalPages)}
          </div>
        </div>
      </nav>
    `;
  }

  private renderActionButton(action: string, label: string, icon: string, disabled: boolean): string {
    return `
      <button type="button" data-pagination-action="${action}" aria-label="${label}" ${disabled ? "disabled" : ""}
              class="grid size-10 place-items-center rounded-xl border border-transparent text-lg text-slate-600 transition
                     hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500
                     disabled:pointer-events-none disabled:opacity-35
                     dark:text-slate-300 dark:hover:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white">
        <span aria-hidden="true">${icon}</span>
      </button>
    `;
  }

  private renderPageButton(page: number, currentPage: number): string {
    const isCurrent = page === currentPage;
    return `
      <button type="button" data-pagination-action="page" data-page="${page}" ${isCurrent ? 'aria-current="page"' : ""}
              aria-label="Page ${page}"
              class="grid size-10 place-items-center rounded-xl text-sm font-semibold transition
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500
                     ${isCurrent
                       ? "bg-purple-600 text-white shadow-sm dark:bg-purple-500"
                       : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-gray-700 dark:hover:text-white"}">
        ${page}
      </button>
    `;
  }
}
