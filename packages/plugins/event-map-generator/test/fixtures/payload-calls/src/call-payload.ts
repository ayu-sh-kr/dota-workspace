export type ExplicitPayload = {
  id: number;
};

export const createArrowPayload = (): ExplicitPayload => ({id: 1});

export function createFunctionPayload(): ExplicitPayload {
  return {id: 2};
}

export const createFunctionExpressionPayload = function (): ExplicitPayload {
  return {id: 3};
};

export const createUnannotatedPayload = () => ({id: 4});

declare const publisher: {
  publish(event: {name: string; data?: unknown}): void;
};

const arrowState = createArrowPayload();
const explicitlyTypedState: ExplicitPayload = createUnannotatedPayload();
const factory = {createArrowPayload};

publisher.publish({name: 'payload:arrow-call', data: createArrowPayload()});
publisher.publish({name: 'payload:identifier-call', data: arrowState});
publisher.publish({name: 'payload:function-return', data: createFunctionPayload()});
publisher.publish({name: 'payload:function-expression-return', data: createFunctionExpressionPayload()});
publisher.publish({name: 'payload:explicit-local-annotation', data: explicitlyTypedState});
publisher.publish({name: 'payload:unannotated-call', data: createUnannotatedPayload()});
publisher.publish({name: 'payload:computed-call', data: factory['createArrowPayload']()});
