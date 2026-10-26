import {render, type RenderOutput} from '@ayu-sh-kr/dota-core';

/** A component instance whose template the tests mount without connecting it. */
type RenderableHost = HTMLElement & {render(): RenderOutput};

/**
 * Mounts a component's current template into its host, as its first connection would.
 * @param host Component instance whose properties are already set.
 */
export function mountTemplate(host: RenderableHost): void {
  render(host, host.render());
}
