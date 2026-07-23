import {describe, expect, it} from 'vitest';
import {EventNamePolicy} from '@dota/scan/EventNamePolicy.ts';

describe('EventNamePolicy.isEventConstantName', () => {
  it.each([
    ['USER_CREATED_EVENT', true],
    ['EVENT_NAME', true],
    ['userCreatedEvent', true],
    ['UserCreatedEvent', true],
    ['eventName', false],
    ['eventful', false],
    ['VALUE', false],
  ])('classifies %s as %s', (name, expected) => {
    expect(EventNamePolicy.isEventConstantName(name)).toBe(expected);
  });
});
