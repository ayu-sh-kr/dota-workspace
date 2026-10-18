import {
  BaseElement,
  BindEvent,
  Component,
  DotaPageElement,
  Number,
  Object as ObjectType,
  Property,
  String,
  type SEO
} from '@ayu-sh-kr/dota-core';
import {html, keyed, when} from '@ayu-sh-kr/dota-rendering';
import type {RenderContext} from '@ayu-sh-kr/dota-ssr/server';

/** Task returned by the playground API. */
export type Task = {
  /** Stable identity used for keyed rendering. */
  id: number;
  /** Display title. */
  title: string;
  /** Whether the task is finished. */
  done: boolean;
};

/** Presentational row rendered entirely from its attributes. */
@Component({selector: 'task-item', shadow: false})
export class TaskItemComponent extends BaseElement {
  @Property({name: 'label', type: String}) label = '';
  @Property({name: 'done', type: String}) done = 'false';

  constructor() {
    super();
  }

  render() {
    return html`<li class="task">${this.done === 'true' ? '✅' : '⬜'} ${this.label}</li>`;
  }
}

/** Interactive island: the server renders its first state, the client takes clicks. */
@Component({selector: 'click-counter', shadow: false})
export class ClickCounterComponent extends BaseElement {
  @Property({name: 'count', type: Number}) count = 0;

  constructor() {
    super();
  }

  @BindEvent({event: 'click', id: '#increment'})
  increment() {
    this.count += 1;
  }

  render() {
    return html`<button id="increment" type="button">Clicked ${this.count} times</button>`;
  }
}

/** Page that loads tasks from the API on the server and templates them into HTML. */
@Component({selector: 'tasks-page', shadow: false})
export class TasksPage extends DotaPageElement {
  @Property({name: 'tasks', type: ObjectType}) tasks: Task[] = [];
  @Property({name: 'rendered-at', type: String}) renderedAt = 'client';

  constructor() {
    super();
  }

  get seo(): SEO {
    return {title: `Tasks (${this.tasks.length}) · Dota light-DOM SSR`, description: 'String-rendered Dota page'};
  }

  async serverLoad(context: RenderContext) {
    const response = await context.fetch('/api/tasks');
    this.tasks = await response.json();
    this.renderedAt = `server ${context.url.pathname}`;
  }

  render() {
    const open = this.tasks.filter((task) => !task.done).length;
    return html`<main>
      <h1>Tasks</h1>
      <p id="origin">Rendered on: ${this.renderedAt}</p>
      ${when(open === 0, html`<p>All done.</p>`, html`<p>${open} open</p>`)}
      <ul>${keyed(this.tasks, (task) => task.id, (task) =>
        html`<task-item label="${task.title}" done="${task.done}"></task-item>`)}</ul>
      <click-counter count="${this.tasks.length}"></click-counter>
    </main>`;
  }
}

/** Components shared by the server engine and the browser bootstrap. */
export const COMPONENTS = [TaskItemComponent, ClickCounterComponent, TasksPage];
