import {isTemplateResult} from './template';
import {PartChange, RenderDiff, RenderOutput, TemplateResult} from './types';

/**
 * Accepts both tagged-template identity and equivalent static segments.
 * Identity is the normal fast path; segment comparison keeps separately created
 * but structurally identical results patchable in tests and adapter code.
 */
function hasSameTemplateStructure(left: TemplateResult, right: TemplateResult): boolean {
  return left.strings === right.strings ||
    (left.strings.length === right.strings.length && left.strings.every((part, index) => part === right.strings[index]));
}

/**
 * Compares two render outputs and identifies the smallest supported commit strategy.
 * Compatible structured templates produce one change record per changed value, while
 * different output kinds or static structures require replacement rather than guessing.
 * @param previous Previously committed output, or `undefined` before the first mount.
 * @param next Output produced by the next render pass.
 * @returns A render diff consumed by the renderer before DOM mutation.
 */
export function diff(previous: RenderOutput | undefined, next: RenderOutput): RenderDiff {
  if (previous === undefined) return {kind: 'mount', changedParts: []};
  if (previous === next) return {kind: 'noop', changedParts: []};

  if (!isTemplateResult(previous) || !isTemplateResult(next)) return {kind: 'replace', changedParts: []};
  if (!hasSameTemplateStructure(previous, next)) return {kind: 'replace', changedParts: []};

  const changes: PartChange[] = [];
  for (let index = 0; index < next.values.length; index++) {
    const nextValue = next.values[index];
    const previousValue = previous.values[index];
    if (!Object.is(previousValue, nextValue)) changes.push({index, previousValue, nextValue});
  }
  return {kind: changes.length === 0 ? 'noop' : 'patch', changedParts: changes};
}
