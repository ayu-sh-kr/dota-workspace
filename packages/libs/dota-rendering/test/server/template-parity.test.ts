// Marker parity: serializeOutput(output, scope) must produce the DOM the client renderer
// builds while emitting durable markers (the SSG path), so both hydrate the same way.
import {serializeOutput} from '@dota/server/index';
import {html, keyed, render, setHydrationEmit, trustedHTML, when, type TemplateResult} from '@dota/main';

const HYDRATION_SCOPE = /\bh\d+\b/g;

/**
 * Reduces markup to a canonical tree: attributes sorted, scope ids renumbered by first
 * appearance, and the renderer's mount-local `data-dota-dynamic` locator values dropped.
 * Both sides are reparsed so text-node splitting cannot cause false differences.
 */
function canonical(markup: string): string {
  const scopes = new Map<string, string>();
  const renumber = (value: string) => value.replace(HYDRATION_SCOPE, (scope) => {
    if (!scopes.has(scope)) scopes.set(scope, `s${scopes.size}`);
    return scopes.get(scope)!;
  });
  const describe = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return `"${node.textContent}"`;
    if (node.nodeType === Node.COMMENT_NODE) return `<!--${renumber((node as Comment).data)}-->`;
    const element = node as Element;
    const attributes = [...element.attributes].map(({name, value}) => {
      if (name === 'data-dota-dynamic') return name;
      return `${name}="${name.startsWith('data-dh-') ? renumber(value) : value}"`;
    }).sort();
    const children = element.localName === 'template' ? (element as HTMLTemplateElement).content.childNodes : element.childNodes;
    return `<${element.localName} ${attributes.join(' ')}>${[...children].map(describe).join('')}</${element.localName}>`;
  };
  const template = document.createElement('template');
  template.innerHTML = markup;
  return [...template.content.childNodes].map(describe).join('');
}

/** Mounts a template with durable markers enabled, as the SSG renderer does. */
function clientMarkup(output: TemplateResult): string {
  const root = document.createElement('div');
  setHydrationEmit(true);
  try {
    render(root, output);
  } finally {
    setHydrationEmit(false);
  }
  return root.innerHTML;
}

describe('serializeOutput marker parity with the client renderer', () => {
  const cases: Array<[string, () => TemplateResult]> = [
    ['text, attribute, and composite attribute parts', () =>
      html`<section class="card ${'wide'} ${'dark'}" title='${"it's"}'><h2>${'Title'}</h2><p>${0} and ${'<b>'}</p></section>`],
    ['conditional branches, keyed lists, and trusted markup', () =>
      html`<div>${when(true, html`<em data-x="${1}">${'yes'}</em>`)}<ul>${keyed([1, 2], (item) => item, (item) =>
        html`<li data-id="${item}">${`row ${item}`}</li>`)}</ul>${trustedHTML('<b>raw</b>')}</div>`],
    ['void elements and self-closing SVG children', () =>
      html`<input value="${'v'}"><br><svg viewBox="0 0 1 1"><path d="${'M0'}"/><circle r="${1}"/></svg><span>${'end'}</span>`],
    ['custom elements and static comments', () =>
      html`<!-- static --><task-item label="${'x'}"></task-item><x-unknown>${'inside'}</x-unknown>`],
    ['inert template content is not indexed', () =>
      html`<template><b>skipped</b></template><i title="${'counted'}">${'after'}</i>`]
  ];

  it.each(cases)('%s', (_, build) => {
    expect(canonical(serializeOutput(build(), 'h0'))).toBe(canonical(clientMarkup(build())));
  });

  // Happy DOM omits the <tbody> the HTML parser inserts for <table><tr>; browsers, where
  // hydration runs, insert and index it, so the server writes and counts it explicitly.
  it('writes and indexes the tbody a browser inserts for rows placed directly in a table', () => {
    const markup = serializeOutput(html`<table><tr><td>${'a'}</td></tr></table><p title="${'after'}"></p>`, 'h0');

    expect(markup).toContain('<table data-dota-index="0"><tbody data-dota-index="1"><tr data-dota-index="2">');
    expect(markup).toContain('</tr></tbody></table><p title="after" data-dota-index="4"');
  });
});
