import './server-element';
import {
  CoreMetadata,
  Metadata,
  PropertyUtils,
  type BaseElement,
  type DotaElementConstructor,
  type SEO
} from '@ayu-sh-kr/dota-core';
import {escapeHtml, serializeOutput} from './template-serializer';
import type {RenderAdapter, RenderContext, RenderResult, ServerLoadable, StringAdapterOptions} from './types';

/** A component instance as the string engine drives it. */
type ServerComponent = BaseElement & ServerLoadable & {readonly seo?: SEO};

/** One registered component host found in serialized markup. */
type HostMatch = {
  /** Offset of the host's opening `<`. */
  readonly start: number;
  /** Offset just past the host's closing tag. */
  readonly end: number;
  /** Custom-element name of the host. */
  readonly selector: string;
  /** Decoded attributes written on the host in source order. */
  readonly attributes: ReadonlyArray<readonly [string, string]>;
  /** Markup authored between the host's opening and closing tags. */
  readonly children: string;
};

const DEFAULT_MAX_DEPTH = 32;
const CUSTOM_ELEMENT_OPEN_TAG =
  /<([a-z][a-z0-9]*-[a-z0-9._-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*>/gi;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};

/**
 * Creates the light-DOM engine that renders Dota components to HTML strings.
 * Each host is constructed against a minimal attribute-only element, seeded with
 * Dota Core's property rules, given one awaited `serverLoad`, and rendered once.
 * Registered hosts inside the output are rendered the same way, concurrently.
 * @param options Components available to the engine and the nesting limit.
 * @throws Error when a component has no `@Component` selector.
 */
export function createStringAdapter(options: StringAdapterOptions): RenderAdapter {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const registry = new Map<string, DotaElementConstructor>();
  for (const component of options.components) {
    if (!component.__dotaSelector) throw new Error(`${component.name} is missing a @Component selector`);
    registry.set(component.__dotaSelector, component);
  }

  /**
   * Renders one host and its descendants as light-DOM or declarative-shadow markup.
   * Properties are reflected after loading so data the server fetched reaches the
   * client as attributes instead of a serialized state script.
   */
  async function renderHost(host: HostMatch, context: RenderContext, depth: number) {
    const Component = registry.get(host.selector);
    if (!Component) throw new Error(`No component is registered for <${host.selector}>`);
    if (depth > maxDepth) throw new Error(`Component nesting exceeded ${maxDepth} levels at <${host.selector}>`);

    const instance = new Component() as ServerComponent;
    host.attributes.forEach(([name, value]) => instance.setAttribute(name, value));
    PropertyUtils.seedInitialValues(instance);
    await instance.serverLoad?.(context);
    reflectProperties(instance);

    const rendered = await expandHosts(serializeOutput(instance.render()), context, depth + 1);
    const content = Component.__dotaShadow
      ? `<template shadowrootmode="open">${rendered}</template>${await expandHosts(host.children, context, depth + 1)}`
      : rendered;
    const attributes = instance.getAttributeNames()
      .map((name) => ` ${name}="${escapeHtml(instance.getAttribute(name) ?? '')}"`).join('');
    return {html: `<${host.selector}${attributes}>${content}</${host.selector}>`, instance};
  }

  /** Replaces every registered host in `markup` with its rendered form. */
  async function expandHosts(markup: string, context: RenderContext, depth: number): Promise<string> {
    const hosts = findHosts(markup, registry);
    if (hosts.length === 0) return markup;

    const rendered = await Promise.all(hosts.map((host) => renderHost(host, context, depth)));
    let output = '';
    let cursor = 0;
    hosts.forEach((host, index) => {
      output += markup.slice(cursor, host.start) + rendered[index].html;
      cursor = host.end;
    });
    return output + markup.slice(cursor);
  }

  return {
    name: 'string',
    async render(selector: string, context: RenderContext): Promise<RenderResult> {
      const page = {start: 0, end: 0, selector, attributes: [], children: ''};
      const {html, instance} = await renderHost(page, context, 0);
      return {html, head: instance.seo};
    }
  };
}

/**
 * Writes every `@Property` value back to its attribute in serialized form.
 * The client upgrades the host from these attributes and therefore renders the
 * same output without repeating the server's data loading.
 * @param instance Component whose properties may have changed in `serverLoad`.
 */
function reflectProperties(instance: ServerComponent): void {
  Metadata.for(instance).get(CoreMetadata.properties).forEach((meta) => {
    const value = instance[meta.prototype];
    if (value === undefined || value === null) return;
    instance.setAttribute(meta.name, meta.type.serialize ? meta.type.serialize(value) : String(value));
  });
}

/**
 * Locates top-level registered hosts and their authored children.
 * Unregistered custom elements are left in place while scanning continues inside
 * them; a registered host's subtree is skipped because its own render owns it.
 * @param markup Serialized component output.
 * @param registry Components the engine can render.
 * @returns Hosts in document order, never overlapping.
 */
function findHosts(markup: string, registry: ReadonlyMap<string, DotaElementConstructor>): HostMatch[] {
  const hosts: HostMatch[] = [];
  const openTag = new RegExp(CUSTOM_ELEMENT_OPEN_TAG.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = openTag.exec(markup))) {
    const selector = match[1].toLowerCase();
    if (!registry.has(selector)) continue;

    const childrenStart = match.index + match[0].length;
    const childrenEnd = findClosingTag(markup, selector, childrenStart);
    const end = childrenEnd === -1 ? childrenStart : childrenEnd + `</${selector}>`.length;
    hosts.push({
      start: match.index,
      end,
      selector,
      attributes: parseAttributes(match[2]),
      children: childrenEnd === -1 ? '' : markup.slice(childrenStart, childrenEnd)
    });
    openTag.lastIndex = end;
  }
  return hosts;
}

/**
 * Finds the closing tag matching an open host, counting nested same-name hosts.
 * @param markup Serialized markup containing the host.
 * @param selector Lowercase element name.
 * @param from Offset just past the host's opening tag.
 * @returns Offset of the matching `</selector>`, or -1 when the host is unclosed.
 */
function findClosingTag(markup: string, selector: string, from: number): number {
  const tags = new RegExp(`<(/?)${selector}(?=[\\s/>])`, 'gi');
  tags.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(markup))) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return match.index;
  }
  return -1;
}

/**
 * Parses the attribute source of an opening tag into decoded name/value pairs.
 * Valueless attributes become empty strings, matching `getAttribute` in a browser.
 * @param source Text between the tag name and the closing `>`.
 */
function parseAttributes(source: string): Array<[string, string]> {
  return [...source.matchAll(ATTRIBUTE)].map((match) =>
    [match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')]);
}

/**
 * Decodes the named and numeric character references `escapeHtml` and authors use.
 * Unknown named references are kept verbatim rather than guessed.
 * @param value Raw attribute value from markup.
 */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (reference, body: string) => {
    if (body[0] !== '#') return ENTITIES[body.toLowerCase()] ?? reference;
    const codePoint = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return String.fromCodePoint(codePoint);
  });
}
