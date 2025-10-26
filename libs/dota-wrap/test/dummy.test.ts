import {describe, expect, test} from "vitest";
import pkg from '../package.json';

describe("Dummy Test", () => {
  test('package has a name', () => {
    expect(typeof pkg.name).toBe('string');
    expect(pkg.name.length).toBeGreaterThan(0);
  })
})