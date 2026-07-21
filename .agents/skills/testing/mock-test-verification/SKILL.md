---
name: mock-test-verification
description: Use when writing or reviewing TypeScript web tests that rely on mocked dependencies and need to verify calls, arguments, return values, and thrown errors.
---

# Mock Test Verification

Use this skill for TypeScript and web-app tests where a unit under test depends on collaborators, browser APIs, network calls, timers, or framework hooks that should be mocked and verified.

## Core rule

Test the unit’s observable behavior, not the mock framework itself. Mock dependencies only at the boundary, then verify the interactions that matter:

- dependency calls happened
- the right arguments were passed
- the method under test returned the expected value
- failures were surfaced with the expected error

## Default workflow

1. Identify the unit under test and its external dependencies.
2. Mock only the dependencies the unit does not own.
3. Arrange the mock return values or rejections needed for the scenario.
4. Exercise the unit.
5. Assert the outcome first.
6. Assert interactions that are part of the contract.
7. Cover the relevant success, failure, and edge-case branches.
8. Assert the error path when the unit is expected to fail.
9. Before finalizing, type-check the test import graph. If a test uses a package alias, confirm the alias is configured in both the test runner and the package `tsconfig.json` (`baseUrl` plus `paths`); otherwise use a stable relative import.
10. Group tests by the source ownership boundary: create a top-level test directory matching the source domain, then one test file per component. When the source has component subdirectories, mirror them under the test directory (for example, `src/components/animations/orb/orb-background.component.ts` maps to `test/animations/orb/orb-background.component.test.ts`).
11. Test non-trivial module-level support functions through their public effects where possible. Cover normalization, fallback, branching, random/cache signatures, rendering helpers, lifecycle setup, and teardown across valid, invalid, boundary, repeated, and missing-browser-API scenarios. Export a helper only when indirect testing cannot observe a stable contract and exposing it is appropriate for the library API.
12. Run the package test command in regular developer mode after focused validation (for example, `pnpm test` without `CI=true` or coverage flags). This catches lifecycle, timer, watch-mode, environment, and dependency behavior that focused or CI-style runs may hide.
13. Triage every failure before changing code. If the production implementation violates the observable contract, keep the failing regression test and write a Markdown report at the package root describing the component, reproduction command, expected behavior, actual behavior, evidence, and recommended source fix. If the failure is caused by the test fixture, matcher, mock, selector, lifecycle setup, or assertion, correct the test instead and do not create a defect report.
14. After triage, rerun the focused test and the regular package test. Report which command passed, which remained blocked, and whether any Markdown defect report was created.
15. Format the test before finalizing it. Generated tests must be readable source code, not compressed single-line blocks.

## Test code quality

- Keep imports, setup, each test case, arrange/act/assert sections, and individual assertions on separate readable lines. Use indentation and blank lines to show the test structure; do not place a complete test, callback, or helper on one line.
- Prefer small named helpers for repeated setup, with one operation per line. Keep long fixture objects and mock responses multiline, and run the package formatter when one is configured.
- Treat dense or single-line generated test blocks as a quality failure even when the tests pass. Formatting must make the scenario, action, expected result, and mock verification easy to scan and review.
- Match every mock to the real signature. A `Promise<Response>` mock belongs in `mockResolvedValue` or `mockReturnValue` for a promise-returning dependency; never pass a promise to `mockResolvedValue`, which expects the resolved `Response` value.
- Do not `await` synchronous or `void` APIs such as lifecycle handlers that schedule async work internally. Use an explicit typed flush helper, fake timers, or await the actual promise returned by the dependency under test.
- Treat TypeScript diagnostics such as TS2345, TS80007, redundant `await`, and “void function return value is used” as test-quality failures. Fix the mock signature or async boundary before considering the suite valid.
- Prefer named helpers such as `flush()` returning `Promise<void>` over repeated untyped `Promise.resolve()` calls when waiting for browser task or microtask completion.

## Completeness and edge cases

Tests should be enriched enough to cover every plausible branch visible from the method’s inputs, dependencies, and control flow. Do not stop after one happy-path test.

Before finalizing tests, check scenarios such as:

- empty, missing, `null`, and `undefined` values where the API permits them
- zero, negative, boundary, maximum, and unusually large values
- strings with whitespace, unusual casing, invalid formats, or special characters
- duplicate items, missing fields, malformed objects, and unexpected extra fields
- optional arguments omitted versus explicitly provided
- dependency success with empty or partial data
- dependency rejection, thrown exceptions, malformed responses, timeouts, and retry exhaustion
- repeated calls, concurrent calls, stale state, and ordering-sensitive behavior
- idempotency, caching, fallback, defaulting, pagination, and normalization branches
- browser conditions such as unavailable storage, offline requests, aborted requests, missing DOM nodes, and event sequences

Use a decision table or parameterized tests when multiple input classes share the same expected behavior. Add a focused test for each distinct observable outcome, not every theoretical value. Avoid speculative cases that the implementation or contract cannot reach. A component test that only checks its root element is incomplete when its support functions contain normalization, fallback, caching, animation, or cleanup branches.

For each edge case, verify the complete contract: returned or rendered result, error behavior, dependency calls, arguments, call count/order, and whether later side effects were correctly skipped or executed.

## What to verify

### Dependency calls

Verify every dependency call that represents required behavior, especially when the call is the effect of the method under test.

Use the narrowest assertion that proves the contract:

- call count
- call order when order matters
- call target when multiple collaborators exist

### Arguments

Verify the actual values passed into the dependency, not just that the dependency was invoked.

Check:

- exact primitive values
- object shape and selected fields
- transformed values
- defaults applied by the unit
- values derived from inputs, state, or config

Prefer partial matching when the test only cares about stable fields.

### Return value

Verify the method under test returns the value the caller depends on.

This matters for:

- pure functions
- adapter methods that map one result to another
- async methods that resolve to data
- methods that normalize or aggregate dependency output

### Errors

Verify the method under test fails in the expected way.

Assert:

- the thrown error type when it is stable
- the error message or code when that is part of the contract
- that the error propagates instead of being swallowed
- that recovery behavior runs before a fallback return when applicable

For async code, verify rejected promises rather than synchronous throws.

## TypeScript-specific guidance

- Type mocks with `vi.fn`, `vi.spyOn`, or the test framework’s equivalent so call signatures stay visible.
- Preserve strong typing on mocked dependencies where practical; avoid `any` unless the API is untyped.
- Mock modules at the boundary, not deep internals, unless the module is the dependency boundary itself.
- Verify object arguments with partial matchers when full equality would make the test brittle.
- Prefer explicit fixture objects over inline anonymous objects when the same shape is reused.

## Web and browser-specific guidance

Use this pattern for common browser dependencies:

- `fetch` or request clients: mock success and failure responses
- `localStorage` / `sessionStorage`: verify keys and serialized payloads
- `window.location`, `history`, router navigation: verify target URLs or route params
- timers: use fake timers when scheduling behavior is the subject of the test
- DOM events: dispatch realistic events and verify the resulting state or callback calls
- custom elements or framework components: verify emitted events, props, and rendered output at the boundary

## Assertion priorities

Prefer this order:

1. returned value or rendered result
2. side effects that define the contract
3. dependency arguments
4. dependency call count

If the behavior is already proven by the result, do not add redundant assertions unless they guard a known regression point.

## Good test shape

- one behavior per test
- one failure mode per test
- arrange mock behavior explicitly
- assert only the contract that matters
- keep the test readable from top to bottom

## Common mistakes

- mocking the thing under test instead of its dependencies
- verifying internal implementation details that can change without affecting behavior
- asserting every call in a chain when one key call is enough
- using brittle deep-equality checks for large arguments
- forgetting to test the rejection path for async behavior
- covering only the happy path while leaving visible branches and boundary inputs untested
- asserting a fallback result without verifying the failed dependency call or the skipped side effects
- not restoring spies or mocks between tests
