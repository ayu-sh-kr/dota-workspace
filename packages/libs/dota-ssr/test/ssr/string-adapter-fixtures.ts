import {BaseElement, Component, DotaPageElement, Number, Object as ObjectType, Property, String, type SEO} from '@ayu-sh-kr/dota-core';
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

/** Every fixture component, as an application would register them. */
export const FIXTURE_COMPONENTS = [TaskItemComponent, ShadowBadgeComponent, TasksPage, StateReaderComponent, EndlessLoopComponent];
