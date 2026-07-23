---
name: test-quality
description: Use when writing, reviewing, or refactoring automated tests and their fixtures or helpers. Keep test files readable, decide when setup belongs inline versus in a support module, and organize and document reusable test support.
---

# Test Quality

Keep each test readable as a behavior narrative: scenario, action, and observable result should be visible without following indirection through unrelated setup.

## Keep test files focused

- Group tests by the method, component, or behavior they exercise, with focused unit tests before broader composition tests.
- Keep arrange, act, and assert sections visually distinct. Name fixtures by the domain behavior they represent, not by their storage shape.
- Keep scenario-specific values and a few clear setup lines in the test. Do not hide the reason a test exists behind a generic helper.
- Remove stale setup, unused fixture fields, and assertions that do not prove the scenario's contract.

## Decide whether to extract support code

Keep setup inline when it is specific to one test and remains easy to read. Use a small local lambda for a short transformation or callback whose meaning is clear at the call site.

Do not create a named helper merely to replace a few lines of obvious setup. A helper is justified when it captures a domain concept, enforces a fixture invariant, removes meaningful repetition across scenarios, or makes a complex object safe and clear to construct.

Extract reusable support into a dedicated, imported test-support module when fixtures or helpers are shared by multiple tests or make the test file harder to scan. Keep the support module beside the test domain and match its naming convention, for example:

```text
test/scan/
├── EventMapScannerMockTest.ts
└── EventMapScannerFixtures.ts
```

## Organize fixtures and helpers

- Group related fixture data, builders, and helper functions together in one support module for the same source unit or domain.
- Keep unrelated domains in separate modules; do not create a catch-all test utilities file.
- Export only the fixtures and helpers that tests consume. Prefer explicit fixtures and narrow builders over mutable global state.
- Reset mutable test state in the test lifecycle, not as a hidden side effect of a fixture factory.
- Keep helper dependencies at test boundaries. A helper may create inputs or configure mocks, but the test should retain assertions for its own behavior.

## Document reusable support

Add concise TSDoc to exported fixtures and helpers when their purpose, invariant, or variable input is not self-evident. Explain what test behavior the support represents and why callers should use it; do not restate obvious types or implementation steps.

Document a builder when it supplies meaningful defaults, a fixture when it represents a domain state, and a helper when it establishes an important mock or lifecycle condition. Do not add documentation to trivial constants or one-line local lambdas.

## Review workflow

1. Read the test file from top to bottom and identify each test's behavior and its setup.
2. Keep one-off, short setup inline; use a local lambda only when it improves the immediate expression.
3. Extract only reusable or domain-significant support into a neighboring fixture module.
4. Group and document that module by the test domain, then import its named exports into the test.
5. Verify that each test still shows its scenario, action, and assertions directly.
6. Format and run the focused test after restructuring.

## Common mistakes

- creating a helper for a literal, a few object fields, or a one-use setup block
- hiding the essential mock behavior or expected value inside a generic factory
- scattering fixtures for one source unit across several unrelated files
- using a global mutable fixture that leaks state between tests
- exporting undocumented builders with surprising defaults
- turning a test into a sequence of helper calls that no longer communicates its behavior
