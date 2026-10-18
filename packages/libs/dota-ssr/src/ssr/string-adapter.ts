import './server-globals';
import {
  CLIENT_ONLY_ATTRIBUTE,
  CoreMetadata,
  Metadata,
  PropertyUtils,
  resolveComponentRenderMode,
  setServerRender,
  type BaseElement,
  type DotaElementConstructor,
  type SEO
} from '@ayu-sh-kr/dota-core';
import {HYDRATION_IDENTITY_ATTRIBUTES, hydrationIdentity, hydrationScope, isTemplateResult} from '@ayu-sh-kr/dota-rendering';
import {escapeHtml, serializeOutput, SHADOW_ROOT_MODE_ATTRIBUTE, TEMPLATE_ELEMENT, tokenizeHtml} from '@ayu-sh-kr/dota-rendering/server';
import {runInBrowserScope} from '@ayu-sh-kr/dota-server-dom/node';
import {routeMarkerAttributes} from '../route-marker';
import type {RenderAdapter, RenderContext, RenderResult, ServerLoadable, StringAdapterOptions} from './types';

type ServerComponent = BaseElement & ServerLoadable & {readonly seo?: SEO};

/** A registered component tag found in markup, spanning `start` (its `<`) to just past its end tag. */
type HostMatch = {
  readonly start: number;
  readonly end: number;
  readonly selector: string;
  /** Decoded, in source order; the first of a duplicate wins. */
  readonly attributes: ReadonlyArray<readonly [string, string]>;
  /** Markup authored between the tags. */
  readonly children: string;
};

/** State shared by every host rendered for one page request. */
type RenderPass = {
  readonly context: RenderContext;
  /** A provisional scope token, or undefined when hydration markers are off. */
  readonly allocateScope: () => string | undefined;
};

const DEFAULT_MAX_DEPTH = 32;
/** Provisional scope token; renumbered to `h0`, `h1`, … in document order once the page is complete. */
const SCOPE_TOKEN = /(\d+)/g;
/** Renders in flight; the server-render flag stays set until the last one finishes. */
let activeRenders = 0;

/**
 * Creates the light-DOM engine that renders Dota components to HTML strings.
 * Each host is constructed against Dota SSR's server element, seeded with Dota Core's
 * property rules, given one awaited `serverLoad`, and rendered once. Registered hosts
 * inside the output are rendered the same way, concurrently. Renders run inside a
 * browser scope, so `window`, `document`, and `location` reflect the request.
 * With hydration (the default), every template-rendered host carries Dota Rendering's
 * durable markers and the page carries the route marker, so `dotaHydration()` adopts
 * the server DOM instead of re-rendering it. `@Component({mode: 'csr'})` hosts are
 * emitted empty and marked, and Dota Core's server-render flag is set during renders.
 * @param options Components available to the engine, the nesting limit, and hydration.
 * @throws Error when a component has no `@Component` selector.
 */
export function createStringAdapter(options: StringAdapterOptions): RenderAdapter {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const hydration = options.hydration ?? true;
  const registry = new Map<string, DotaElementConstructor>();
  for (const component of options.components) {
    if (!component.__dotaSelector) throw new Error(`${component.name} is missing a @Component selector`);
    registry.set(component.__dotaSelector, component);
  }

  /**
   * Renders one host and its descendants as light-DOM or declarative-shadow markup.
   * Properties are reflected after loading so data the server fetched reaches the
   * client as attributes instead of a serialized state script. A template-rendered
   * host is stamped with its template identity and a scope that owns its part markers.
   */
  async function renderHost(host: HostMatch, pass: RenderPass, depth: number) {
    const Component = registry.get(host.selector);
    if (!Component) throw new Error(`No component is registered for <${host.selector}>`);
    if (depth > maxDepth) throw new Error(`Component nesting exceeded ${maxDepth} levels at <${host.selector}>`);

    const instance = new Component() as ServerComponent;
    host.attributes.forEach(([name, value]) => instance.setAttribute(name, value));
    HYDRATION_IDENTITY_ATTRIBUTES.forEach((name) => instance.removeAttribute(name));
    const clientOnly = resolveComponentRenderMode(Component) === 'csr';
    let content = '';
    if (clientOnly) {
      // Matches BaseElement during a server render: an empty, marked host the browser mounts fresh.
      instance.setAttribute(CLIENT_ONLY_ATTRIBUTE, '');
    } else {
      PropertyUtils.seedInitialValues(instance);
      await instance.serverLoad?.(pass.context);
      reflectProperties(instance);

      const output = instance.render();
      // Only structured templates can be adopted; legacy strings and `nothing` are remounted by the client.
      const scope = isTemplateResult(output) ? pass.allocateScope() : undefined;
      if (scope !== undefined && isTemplateResult(output)) {
        Object.entries(hydrationIdentity(host.selector, output.strings, scope)).forEach(([name, value]) => instance.setAttribute(name, value));
      }
      const rendered = await expandHosts(serializeOutput(output, scope), pass, depth + 1);
      content = Component.__dotaShadow
        ? `<template shadowrootmode="open">${rendered}</template>${await expandHosts(host.children, pass, depth + 1)}`
        : rendered;
    }

    const attributes = instance.getAttributeNames()
      .map((name) => ` ${name}="${escapeHtml(instance.getAttribute(name) ?? '')}"`).join('');
    return {html: `<${host.selector}${attributes}>${content}</${host.selector}>`, instance};
  }

  /** Replaces every registered host in `markup` with its rendered form. */
  async function expandHosts(markup: string, pass: RenderPass, depth: number): Promise<string> {
    const hosts = findHosts(markup, registry);
    if (hosts.length === 0) return markup;

    const rendered = await Promise.all(hosts.map((host) => renderHost(host, pass, depth)));
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
      // The router stamps `path` on a page it mounts; the route marker lets it keep this one instead.
      const routeAttributes: Array<[string, string]> = hydration
        ? [['path', context.url.pathname], ...Object.entries(routeMarkerAttributes())]
        : [];
      const page: HostMatch = {start: 0, end: 0, selector, attributes: routeAttributes, children: ''};
      let scopeCount = 0;
      const pass: RenderPass = {context, allocateScope: () => hydration ? `${scopeCount++}` : undefined};

      activeRenders += 1;
      setServerRender(true);
      try {
        return await runInBrowserScope(context.url, async () => {
          const {html, instance} = await renderHost(page, pass, 0);
          return {html: renumberScopesInDocumentOrder(html), head: instance.seo};
        });
      } finally {
        activeRenders -= 1;
        if (activeRenders === 0) setServerRender(false);
      }
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
 * Replaces provisional scope tokens with `h0`, `h1`, … in order of first appearance.
 * Sibling hosts load concurrently, so tokens are handed out in completion order;
 * numbering the finished page by position makes output identical for identical input.
 * @param html Complete page markup.
 */
function renumberScopesInDocumentOrder(html: string): string {
  const scopes = new Map<string, string>();
  return html.replace(SCOPE_TOKEN, (_, token: string) => {
    let scope = scopes.get(token);
    if (!scope) scopes.set(token, scope = hydrationScope(scopes.size));
    return scope;
  });
}

/**
 * Locates top-level registered hosts and their authored children.
 * Tokenizing (rather than pattern matching) means tags inside comments, `<script>`,
 * `<style>`, `<textarea>`, attribute values, and inert `<template>` content are never
 * taken for hosts; declarative shadow roots are live content and are searched.
 * Unregistered custom elements stay in place while scanning continues inside them;
 * a registered host's subtree is skipped because its own render owns it. An unclosed
 * host extends to the end of the markup, as the HTML parser would make it.
 * @param markup Serialized component output.
 * @param registry Components the engine can render.
 * @returns Hosts in document order, never overlapping.
 */
function findHosts(markup: string, registry: ReadonlyMap<string, DotaElementConstructor>): HostMatch[] {
  const hosts: HostMatch[] = [];
  const tokens = tokenizeHtml(markup);
  const templates: boolean[] = [];

  for (let token = tokens.next(); !token.done; token = tokens.next()) {
    const tag = token.value;
    if (tag.kind === 'end-tag' && tag.name === TEMPLATE_ELEMENT) templates.pop();
    if (tag.kind !== 'start-tag') continue;
    if (tag.name === TEMPLATE_ELEMENT) {
      templates.push(!tag.attributes.some((attribute) => attribute.name === SHADOW_ROOT_MODE_ATTRIBUTE));
      continue;
    }
    if (templates.includes(true) || !registry.has(tag.name)) continue;

    let depth = 1;
    let childrenEnd = markup.length;
    let end = markup.length;
    for (let inner = tokens.next(); !inner.done; inner = tokens.next()) {
      const nested = inner.value;
      if (nested.kind === 'start-tag' && nested.name === tag.name) depth += 1;
      if (nested.kind === 'end-tag' && nested.name === tag.name && --depth === 0) {
        childrenEnd = nested.start;
        end = nested.end;
        break;
      }
    }

    const seen = new Set<string>();
    const attributes = tag.attributes
      .filter((attribute) => !seen.has(attribute.name) && seen.add(attribute.name))
      .map((attribute) => [attribute.name, attribute.value] as const);
    hosts.push({start: tag.start, end, selector: tag.name, attributes, children: markup.slice(tag.end, childrenEnd)});
  }
  return hosts;
}
