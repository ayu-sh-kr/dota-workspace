---
name: type-documentation
description: Add or improve concise TSDoc for TypeScript types, interfaces, enums, and their meaningful members. Use when a type's shape is visible but its purpose, reason for existing, consumers, lifecycle role, or relationship to other contracts is unclear.
---

# Type Documentation

Document types as domain contracts so developers understand their relevance without reading every caller.

## Workflow

1. Read the declaration and trace its real references before writing documentation.
2. Identify what the type represents, why a separate contract is needed, and where it is produced or consumed.
3. Inventory the type's members and trace the behavior that gives each meaningful member its semantics.
4. Add concise TSDoc immediately above the declaration and its documented members.
5. Recheck the comments against the implementation and run the package type check.

## Documentation standard

- Use plain English and normally keep a type comment to two or three short sentences.
- Start with what the contract represents in domain terms.
- Explain why it exists when the reason is not obvious from its fields.
- Name the relevant workflow or consumer, such as a scanner, serializer, public API, writer, or configuration normalizer.
- Describe relationships to nearby types when they explain a handoff or lifecycle stage.
- Keep public API documentation useful to consumers and internal documentation useful to maintainers.

## Member and content documentation

- When the request asks for the fields, members, or content of a type, document every member in scope, including members that look obvious from their names or primitive types.
- Explain each member's behavioral role: what it contains, who supplies it, how a consumer interprets it, and any relevant default, optional/absent state, sentinel value, format, ordering, ownership, or downstream effect.
- For arrays, unions, nullable values, and nested contracts, describe the meaningful variants and how they change the surrounding workflow rather than merely repeating the TypeScript syntax.
- Keep member comments short and contextual. A useful member comment answers "what does this value cause the system to do?" without duplicating the declaration.

## Avoid

- Do not restate the type name or list fields in prose.
- Do not claim usage without tracing references.
- Do not omit a member when the user explicitly asks for field or content documentation; even an obvious member should receive a concise semantic comment in that case.
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
- Does every requested member have a contextual comment covering its meaning and behavior?
- Are member comments focused on semantics, defaults, constraints, ownership, and downstream effects rather than type restatement?
- Is the wording concise, factual, and understandable without repository archaeology?
