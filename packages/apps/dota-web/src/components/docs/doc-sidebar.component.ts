import {BaseElement, BindEvent, Component, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {docConfigs} from "@dota/configs/doc.config.ts";

/**
 * DocSidebarComponent
 *
 * Desktop  — permanent scrollable column pinned below the doc-header.
 * Mobile   — off-screen drawer, slides in on 'doc:sidebar-toggle' event.
 *            Backdrop click and the X button both fire the same toggle.
 *
 * Re-renders on 'popstate' (route change) so active states stay current.
 * Fires 'doc:nav' on window when a link is tapped so the drawer auto-closes.
 */
@Component({
    selector: 'doc-sidebar',
    shadow: false
})
export class DocSidebarComponent extends BaseElement {

    private mobileOpen: boolean = false;

    constructor() {
        super();
    }

    // ── window event listeners ────────────────────────────────────────────────

    @WindowListener({event: 'doc:sidebar-toggle'})
    onSidebarToggle() {
        this.mobileOpen = !this.mobileOpen;
        this.updateHTML();
    }

    @WindowListener({event: 'popstate'})
    onRouteChange() {
        this.mobileOpen = false;
        this.updateHTML();
    }

    @WindowListener({event: 'doc:nav'})
    onDocNav() {
        this.mobileOpen = false;
        this.updateHTML();
    }

    // ── close button (inside drawer) ──────────────────────────────────────────

    @BindEvent({event: 'click', id: '#drawer-close-btn'})
    onDrawerClose() {
        this.mobileOpen = false;
        this.updateHTML();
    }

    @BindEvent({event: 'click', id: 'sidebar-backdrop'})
    onBackdropClick() {
        this.mobileOpen = false;
        this.updateHTML();
    }

    private buildNavTree(): TemplateResult[] {
        return docConfigs.map(config => html`
            <div class="mb-6">
                <h2 class="mb-2 px-3 text-[11px] font-bold uppercase tracking-widest
                           text-gray-400 dark:text-gray-500">
                    ${config.category}
                </h2>
                <ul class="space-y-0.5">
                    ${config.paths.map(path => html`
                        <li><doc-path file-path=${path}></doc-path></li>
                    `)}
                </ul>
            </div>
        `);
    }

    render(): TemplateResult {
        const backdropVis = this.mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none';

        const drawerPos = this.mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full';

        return html`
            <!-- Desktop sidebar — hidden below lg breakpoint -->
            <aside class="hidden lg:flex flex-col
                          w-60 xl:w-64 shrink-0
                          sticky top-14
                          h-[calc(100vh-3.5rem)]
                          border-r border-gray-200 dark:border-gray-800
                          bg-gray-50 dark:bg-gray-900">

                <!-- Section label row -->
                <div class="px-4 pt-5 pb-3 shrink-0
                            border-b border-gray-200 dark:border-gray-800">
                    <p class="text-[11px] font-bold uppercase tracking-widest
                               text-gray-400 dark:text-gray-500">
                        On this site
                    </p>
                </div>

                <!-- Scrollable nav -->
                <nav class="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                    ${this.buildNavTree()}
                </nav>
            </aside>

            <!-- Mobile: backdrop -->
            <div id="sidebar-backdrop"
                 class="lg:hidden fixed inset-0 z-40
                        bg-gray-950/50 dark:bg-gray-950/70
                        backdrop-blur-sm
                        transition-opacity duration-300 ease-in-out
                        ${backdropVis}">
            </div>

            <!-- Mobile: drawer panel -->
            <aside class="lg:hidden fixed inset-y-0 left-0 z-50
                          w-72 flex flex-col
                          bg-white dark:bg-gray-900
                          border-r border-gray-200 dark:border-gray-800
                          shadow-2xl
                          transform transition-transform duration-300 ease-in-out
                          ${drawerPos}">

                <!-- Drawer header row -->
                <div class="flex items-center justify-between shrink-0
                            px-4 h-14
                            border-b border-gray-200 dark:border-gray-800">
                    <a href="/" class="font-extrabold text-lg text-gray-900 dark:text-white">
                        Dota <span class="text-purple-600 dark:text-purple-400">Docs</span>
                    </a>
                    <button id="drawer-close-btn"
                            class="flex items-center justify-center w-9 h-9 rounded-lg
                                   text-gray-500 dark:text-gray-400
                                   hover:bg-gray-100 dark:hover:bg-gray-800
                                   transition-colors duration-150"
                            aria-label="Close navigation">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6"  x2="6"  y2="18"/>
                            <line x1="6"  y1="6"  x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <!-- Scrollable nav inside drawer -->
                <nav class="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                    ${this.buildNavTree()}
                </nav>
            </aside>
        `;
    }
}
