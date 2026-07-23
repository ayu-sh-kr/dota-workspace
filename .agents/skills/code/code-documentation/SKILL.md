---
name: code-documentation
description: Use when adding or improving developer-facing documentation in TypeScript source code. Defines concise TSDoc for explaining why a method exists, what it does, why it behaves that way, and what each parameter means without duplicating the implementation.
---

# Code Documentation

Use this skill when documenting TypeScript classes, functions, methods, or exported APIs for developers who need to maintain or extend the code. Visibility does not determine documentation depth: every non-trivial method in a touched utility or service, including private helpers, must explain the policy a maintainer must preserve.

## Documentation standard

Use TSDoc block comments (`/** ... */`) immediately above the declaration. Keep normal method documentation to 5–9 lines maximum, including tags. Make each line carry useful information:

1. Explain why the method exists or what problem it solves.
2. State what the method does in observable terms.
3. Explain why the important behavior or ordering is necessary.
4. Add `@param` for every parameter, including the meaning of optional/default values.
5. Add `@returns` when the return value needs meaning beyond its TypeScript type.
6. Add `@throws` when callers need to know about expected failure modes.

## What good documentation covers

- Document exported functions, public methods, lifecycle hooks with non-obvious behavior, and helpers whose name does not explain their policy.
- Document every non-trivial method in the touched code, whether public, protected, or private. Private visibility does not reduce the requirement: explain selection, fallback, normalization, ordering, error behavior, or representation coordination whenever a maintainer could change it incorrectly without that context. Truly trivial private accessors may use a concise one-line TSDoc comment, but do not leave policy-bearing helpers undocumented.
- Describe inputs in domain terms: what a path, root, scan list, AST node, or configuration option represents and how it affects the result.
- Call out side effects such as filesystem writes, logging, mutation, caching, event registration, or updating generated artifacts.
- Explain decisions that are easy to break, such as sorting for deterministic output, filtering supported file shapes, normalizing path separators, or coalescing concurrent refreshes.
- Prefer one focused comment per method. Add a short class or module comment only when it provides context that individual methods cannot.

## What to avoid

- Do not repeat the method name, parameter type, return type, or the next line of implementation in prose.
- Avoid comments for truly trivial private methods whose behavior is obvious from their implementation; document every private method that carries policy, side effects, recovery, or a maintenance-sensitive invariant using the same standard as public APIs.
- Do not add speculative guarantees, implementation details that are likely to change, or comments that become false when the code changes.
- Do not use comments to justify unclear code; refactor confusing code when a comment would need to explain too much.

## Recommended shape

```ts
/**
 * Keeps generated web-type entries stable across scans.
 * Sorts properties and components by their visible identity, then uses source
 * metadata as deterministic tie-breakers so generated files do not churn.
 * @param scannedInfos Component metadata collected from source files.
 * @returns A new sorted list; the input list and nested property arrays stay unchanged.
 */
function sortWebComponentInfos(scannedInfos: WebComponentInfo[]): WebComponentInfo[] {
  // implementation
}
```

## Review checklist

Before finishing, check that every non-trivial touched declaration has adjacent TSDoc, regardless of visibility; that each comment explains purpose, observable result, rationale, fallback/error policy, and every parameter; that comments stay within the 5–9 line target unless complexity genuinely requires more; and that the wording still matches the implementation after the change.
