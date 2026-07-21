---
name: type-documentation
description: Add or improve concise TSDoc for TypeScript types, interfaces, enums, and their meaningful members. Use when a type's shape is visible but its purpose, reason for existing, consumers, lifecycle role, or relationship to other contracts is unclear.
---

# Type Documentation

Document types as domain contracts so developers understand their relevance without reading every caller.

## Workflow

1. Read the declaration and trace its real references before writing documentation.
2. Identify what the type represents, why a separate contract is needed, and where it is produced or consumed.
3. Add concise TSDoc immediately above the declaration.
4. Document individual members only when their name and TypeScript type do not explain defaults, invariants, format, ownership, or downstream behavior.
5. Recheck the comment against the implementation and run the package type check.

## Documentation standard

- Use plain English and normally keep a type comment to two or three short sentences.
- Start with what the contract represents in domain terms.
- Explain why it exists when the reason is not obvious from its fields.
- Name the relevant workflow or consumer, such as a scanner, serializer, public API, writer, or configuration normalizer.
- Describe relationships to nearby types when they explain a handoff or lifecycle stage.
- Keep public API documentation useful to consumers and internal documentation useful to maintainers.

## Avoid

- Do not restate the type name or list fields in prose.
- Do not claim usage without tracing references.
- Do not document obvious members such as `name: string` unless the value has domain-specific meaning.
- Do not add implementation detail that can change without changing the contract.
- Do not make comments verbose to compensate for a poorly named or overly broad type; improve the type first when needed.

## Recommended shape

```ts
/**
 * Carries normalized component metadata shared by each output serializer.
 * It prevents Web Types and CEM generation from rescanning source files and is
 * produced by the scanner before either schema builder runs.
 */
export type WebComponentInfo = {
  // members
};
```

## Review checklist

- Does the comment answer what the type represents?
- Does it explain why the contract is needed when that is non-obvious?
- Does it identify where the type enters or affects the workflow?
- Are member comments limited to meaningful semantics and constraints?
- Is the wording concise, factual, and understandable without repository archaeology?
