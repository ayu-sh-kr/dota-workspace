import { HTML } from '@dota/core';

describe('HTML template rendering', () => {
  it('renders falsy values that are not nullish', () => {
    const output = HTML`${0}|${false}|${Number.NaN}|${''}`;

    expect(output).toBe('0|false|NaN|');
  });

  it('omits null and undefined interpolations', () => {
    const output = HTML`before:${null}:${undefined}:after`;

    expect(output).toBe('before:::after');
  });
});
