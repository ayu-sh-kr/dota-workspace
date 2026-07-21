---
name: code-quality
description: Review TypeScript structure for unnecessary private wrappers, duplicated logic, and over-abstraction while preserving meaningful domain boundaries. Use when refactoring small methods, reducing indirection, or evaluating whether a helper deserves to exist.
---

# Code Quality

Use this skill when reviewing or refactoring TypeScript code for clarity, focused abstractions, and maintainable method structure.

## Method and helper review

- Prefer one method when a public method only delegates to a private method and the private method adds no independent policy, validation, reuse, or test boundary.
- Inline short private helpers that merely repeat a few lines once and whose extraction does not clarify a domain concept.
- Keep a private helper when it has a meaningful name, isolates a complex algorithm, centralizes a policy, is reused, or protects a maintenance-sensitive invariant.
- Do not optimize for the fewest methods at the expense of readable control flow. A longer method is not automatically better than a well-named abstraction.
- Treat public API boundaries separately from implementation helpers; removing a private wrapper must not change the public signature or behavior.

## Domain utility extraction

- Keep entry modules, factories, and plugin hooks focused on orchestration and lifecycle behavior.
- Move stateless reusable policies into narrow domain utility classes with static methods when they need no instance state, dependency injection, or lifecycle.
- Name each class for the domain it owns, such as `ComponentSourceUtils`; do not create a generic catch-all `Utils` class.
- Group methods only when they share domain vocabulary, inputs, or invariants. Avoid both one class per tiny helper and unrelated methods collected merely to shorten a file.
- Keep one-off trivial expressions inline, and keep core workflows in their domain service or entry module when extraction would only hide control flow.
- Preserve public exports and observable behavior unless the requested change explicitly includes an API revision.

## Named type contracts

- Replace anonymous object annotations on function parameters, return values, collections, and shared state when the shape has multiple fields or represents a domain contract.
- Give types role-based names such as `GenerationOptions`, `ScanCandidate`, or `WriteResult` so callers can understand the boundary without reading an inline structure.
- Place reusable and public contracts in the domain's dedicated type module near related types. Keep a named type local only when it is genuinely private to one implementation file.
- Export the named options or result type when it belongs to an exported function's public API.
- Reuse or extend an existing named contract when shapes overlap, provided the relationship remains obvious and does not create misleading coupling.
- Leave inferred object literals and tiny callback-local shapes inline when naming them would add navigation without clarifying a boundary.

## Refactoring workflow

1. Trace callers and identify whether each method is part of a public contract.
2. Inventory anonymous structural annotations and decide which ones represent named domain contracts.
3. Inventory local helpers and assign each reusable policy to a logical domain owner before creating files.
4. Compare wrappers and delegated methods for independent behavior, reuse, error handling, or a meaningful abstraction boundary.
5. Inline thin, single-use implementation details; extract stateless shared policy only when the destination has clear domain cohesion.
6. Preserve comments at the surviving or extracted method and update them to describe the resulting policy.
7. Run focused tests and type checks after the change.

## Review checklist

- Does each remaining method represent a meaningful operation or policy?
- Is a helper reused, complex, or independently testable?
- Would inlining make the control flow harder to understand?
- Does every extracted utility class have one coherent domain rather than acting as a miscellaneous bucket?
- Would any extracted utility need instance state or dependencies, making a service more appropriate than static methods?
- Do exported functions use named option and result contracts instead of anonymous multi-field object types?
- Are named contracts stored with their domain rather than scattered through entry and implementation modules?
- Did the refactor preserve the public API and edge-case behavior?
- Are comments and tests aligned with the resulting structure?
