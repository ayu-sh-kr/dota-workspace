import {isTemplateResult} from './template';
import type {PartChange, RenderDiff, RenderOutput, TemplateResult} from './types';

/**
 * Determines whether existing part indexes remain valid for the next template.
 * Tagged-template identity is the normal fast path; segment comparison keeps
 * separately created but equivalent template results patchable.
 * @param previous Previously committed structured output.
 * @param next Structured output produced by the next render pass.
 * @returns Whether both templates describe the same static DOM structure.
 */
function hasSameTemplateStructure(previous: TemplateResult, next: TemplateResult): boolean {
  if (previous.strings === next.strings) return true;
  return previous.strings.length === next.strings.length &&
    previous.strings.every((segment, index) => segment === next.strings[index]);
}

/**
 * Selects the smallest safe commit for two render outputs without touching the DOM.
 * Compatible templates report changed interpolation indexes using `Object.is`
 * semantics; output-kind or static-structure changes require full replacement.
 * @param previous Previously committed output, or `undefined` before the first mount.
 * @param next Output produced by the next render pass.
 * @returns The comparison result consumed by the active rendering strategy.
 */
export function diff(previous: RenderOutput | undefined, next: RenderOutput): RenderDiff {
  if (previous === undefined) return {kind: 'mount', changedParts: []};
  if (previous === next) return {kind: 'noop', changedParts: []};

  if (!isTemplateResult(previous) || !isTemplateResult(next)) return {kind: 'replace', changedParts: []};
  if (!hasSameTemplateStructure(previous, next)) return {kind: 'replace', changedParts: []};

  const changedParts: PartChange[] = [];
  for (let index = 0; index < next.values.length; index += 1) {
    const nextValue = next.values[index];
    const previousValue = previous.values[index];
    if (!Object.is(previousValue, nextValue)) changedParts.push({index, previousValue, nextValue});
  }
  return {kind: changedParts.length === 0 ? 'noop' : 'patch', changedParts};
}
