---
name: doc-formatting
description: Use when writing, rewriting, or reviewing markdown tutorial docs in this workspace, especially files under packages/apps/dota-web/public/blogs/tutorial. Enforces readable learning flow, descriptive section bodies, concise examples, and consistent heading setup for general-audience technical articles.
---

# Doc Formatting

Use this skill for tutorial-style markdown where the reader should learn concepts step by step.

## Core Flow

Structure docs so each section adds to the previous section.

1. Start with the concept in plain language.
2. Explain why it matters before introducing deeper details.
3. Add examples only after the reader has the basic idea.
4. Use bullets for supporting points, not as the whole section body.
5. End with a `Summary` section that restates the flow in order.

## Heading Rules

Every main heading must open with a descriptive paragraph. Do not make a heading whose body is only a list, table, or one-line definition.

Good:

```markdown
## Key Size

The key size decides how large the secret value is and how many possible keys an attacker would need to try. AES keeps the block size fixed, but allows different key sizes depending on the security margin needed.

| AES Variant | Key Size | Rounds |
| --- | --- | --- |
```

Avoid:

```markdown
## Key Size

AES supports:

- AES-128
- AES-192
- AES-256
```

## Paragraph Style

Prefer compact paragraphs of two to four sentences. Avoid long walls of text, but also avoid breaking every sentence into its own paragraph.

Use single-line paragraphs only for emphasis, formulas, or short transition lines.

## Examples

Use fenced `text` blocks for diagrams, formulas, or byte-level examples.

Introduce every example before the block, then explain what the reader should notice after the block.

## Lists

Use lists after the section has already explained the idea.

Lists work well for:

- variants
- step summaries
- common mistakes
- practical rules
- final takeaways

Do not use lists as a replacement for explanation.

## General Audience Tone

Keep the writing descriptive and understandable without becoming overly scientific. Define technical terms when they first appear, but avoid a standalone glossary unless the user explicitly asks for one.

Prefer wording like:

- "You can think of this as..."
- "The important part is..."
- "In practice..."

Avoid unexplained jargon and avoid ending sections abruptly.
