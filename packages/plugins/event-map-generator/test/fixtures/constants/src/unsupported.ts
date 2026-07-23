// @ts-nocheck
import {OnEvent} from '@ayu-sh-kr/dota-wrap/event';
import {UserEvents} from './events.ts';

const KEY = 'STATIC_EVENT';
const CYCLE_EVENT = CYCLE_ALIAS;
const CYCLE_ALIAS = CYCLE_EVENT;
const DYNAMIC_EVENT = `dynamic:${Date.now()}`;
const FUNCTION_EVENT = createEventName();
const COMPUTED_EVENT = UserEvents[KEY];

let mutableEvent = 'mutable:event';
var variableEvent = 'variable:event';

function createEventName(): string {
  return 'function:event';
}

export class UnsupportedFeature {
  @OnEvent(CYCLE_EVENT)
  cycle() {}

  @OnEvent(DYNAMIC_EVENT)
  dynamic() {}

  @OnEvent(FUNCTION_EVENT)
  functionBased() {}

  @OnEvent(COMPUTED_EVENT)
  computed() {}

  @OnEvent(mutableEvent)
  mutable() {}

  @OnEvent(variableEvent)
  variable() {}
}
