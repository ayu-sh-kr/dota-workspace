import {BaseElement, Component, DotaPageElement, isServerRender, Number, Object as ObjectType, Property, String, type SEO} from '@ayu-sh-kr/dota-core';
import {html, keyed, nothing, when} from '@ayu-sh-kr/dota-rendering';
import type {RenderContext} from '@dota/ssr/index';

/** One row of the task list the page loads from its API. */
export type Task = {
  /** Stable identity used for keyed rendering. */
  id: number;
  /** User-authored title; may contain markup that must be escaped. */
  title: string;
};

/** Light-DOM child whose output depends only on attributes. */
@Component({selector: 'task-item', shadow: false})
export class TaskItemComponent extends BaseElement {
  @Property({name: 'label', type: String}) label = '';
  @Property({name: 'position', type: Number}) position = 0;

  constructor() {
    super();
  }

  render() {
    return html`<li class="task" data-position="${this.position}">${this.label}</li>`;
  }
}

/** Shadow-root component used to check declarative shadow DOM output. */
@Component({selector: 'shadow-badge', shadow: true})
export class ShadowBadgeComponent extends BaseElement {
  @Property({name: 'count', type: Number}) count = 0;

  constructor() {
    super();
  }

  render() {
    return html`<span part="count">${this.count}</span><slot></slot>`;
  }
}

/** Page that loads tasks through the request context and renders them as children. */
@Component({selector: 'tasks-page', shadow: false})
export class TasksPage extends DotaPageElement {
  @Property({name: 'tasks', type: ObjectType}) tasks: Task[] = [];

  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: `Tasks (${this.tasks.length})`, description: 'Server-rendered task list'};
  }

  async serverLoad(context: RenderContext) {
    const response = await context.fetch('/api/tasks');
    this.tasks = await response.json();
    context.state.set('task-count', this.tasks.length);
  }

  render() {
    return html`<main>
      <h1>Tasks</h1>
      ${when(this.tasks.length === 0, html`<p class="empty">Nothing to do</p>`)}
      <ul>${keyed(this.tasks, (task) => task.id, (task, index) =>
        html`<task-item label="${task.title}" position="${index}"></task-item>`)}</ul>
      <shadow-badge count="${this.tasks.length}"><em>open</em></shadow-badge>
    </main>`;
  }
}

/** Reads a value another component stored in the shared per-request state. */
@Component({selector: 'state-reader', shadow: false})
export class StateReaderComponent extends BaseElement {
  @Property({name: 'seen', type: String}) seen = '';

  constructor() {
    super();
  }

  serverLoad(context: RenderContext) {
    this.seen = `${context.state.get('visitor') ?? 'nobody'}`;
  }

  render() {
    return this.seen ? html`<p>${this.seen}</p>` : nothing;
  }
}

/** Opts out of server output; its render must never run on the server. */
@Component({selector: 'client-only-panel', shadow: false, mode: 'csr'})
export class ClientOnlyPanelComponent extends BaseElement {
  @Property({name: 'label', type: String}) label = '';

  constructor() {
    super();
  }

  serverLoad() {
    throw new Error('serverLoad must not run for client-only components');
  }

  render() {
    return html`<p>${isServerRender() ? 'server' : 'client'} ${this.label}</p><task-item label="nested"></task-item>`;
  }
}

/** Reports the server-render flag it sees while rendering. */
@Component({selector: 'render-flag-probe', shadow: false})
export class RenderFlagProbeComponent extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return html`<p>${isServerRender()}</p><client-only-panel label="later"><b>authored</b></client-only-panel>`;
  }
}

/** Includes itself without a base case, so only the depth limit can stop it. */
@Component({selector: 'endless-loop', shadow: false})
export class EndlessLoopComponent extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return html`<endless-loop></endless-loop>`;
  }
}

/** Writes registered tags where the HTML parser would not create elements, plus one live host. */
@Component({selector: 'markup-probe', shadow: false})
export class MarkupProbeComponent extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return html`<!-- <task-item label="comment"></task-item> --><script>const tag = '<task-item label="script"></task-item>';</script><template><task-item label="inert"></task-item></template><p title="<task-item>"></p><task-item label="live" label="duplicate"></task-item>`;
  }
}

/** Reads request-backed browser globals and mutates its host through element APIs. */
@Component({selector: 'browser-probe', shadow: false})
export class BrowserProbeComponent extends BaseElement {
  @Property({name: 'seen', type: String}) seen = '';

  constructor() {
    super();
  }

  async serverLoad(context: RenderContext) {
    await context.fetch('/api/wait');
    this.classList.add('ready');
    this.dataset.theme = 'dark';
    this.style.setProperty('--gap', '1rem');
    // `String` and `Number` here are Dota Core property types, so the count is built without them.
    localStorage.setItem('visits', `${parseInt(localStorage.getItem('visits') ?? '0', 10) + 1}`);
    this.seen = [window.location.pathname, document.location.search, localStorage.getItem('visits'), matchMedia('(min-width: 1px)').matches].join('|');
  }

  render() {
    return html`<p>${this.seen}</p>`;
  }
}

/** Uses the legacy string render contract, which the client can only re-render. */
@Component({selector: 'legacy-note', shadow: false})
export class LegacyNoteComponent extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return '<p>legacy</p>';
  }
}

/** Wraps authored children, which its template places in the `data-dota-slot` element. */
@Component({selector: 'slot-card', shadow: false})
export class SlotCardComponent extends BaseElement {
  @Property({name: 'heading', type: String})
  heading = '';

  constructor() {
    super();
  }

  render() {
    return html`<section class="card"><h3>${this.heading}</h3><div class="body" data-dota-slot></div></section>`;
  }
}

/** Authors light-DOM children, including a nested host, inside a slotted component. */
@Component({selector: 'slot-page', shadow: false})
export class SlotPage extends BaseElement {
  constructor() {
    super();
  }

  render() {
    return html`<slot-card heading="Notes"><task-item label="Nested" position="0"></task-item> and text</slot-card>`;
  }
}

/** Every fixture component, as an application would register them. */
export const FIXTURE_COMPONENTS = [
  TaskItemComponent, ShadowBadgeComponent, TasksPage, StateReaderComponent, EndlessLoopComponent,
  ClientOnlyPanelComponent, RenderFlagProbeComponent, MarkupProbeComponent, BrowserProbeComponent, LegacyNoteComponent,
  SlotCardComponent, SlotPage
];
