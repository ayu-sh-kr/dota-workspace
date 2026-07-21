---
name: blog-formating
description: Use when writing, rewriting, or reviewing Markdown blog posts in this workspace, especially tutorial articles under packages/apps/dota-web/public/blogs. Enforces a clear reader journey, descriptive sections, concise examples, approachable technical language, and publication-ready structure.
---

# Blog Formating

Use this skill for public-facing blog articles, especially technical tutorials that teach a concept progressively. Use `feature-documentation` instead for internal project, service, or feature documentation.

## Article flow

Structure the article as a connected learning journey. Start with the reader's problem, establish the minimum context, then add concepts and implementation detail in the order needed to understand the conclusion.

1. Open with the problem, audience, or motivating question.
2. Explain the core idea in plain language before introducing jargon or syntax.
3. Explain why the idea matters and when it is useful.
4. Build from simple examples to the complete technique.
5. Connect each section to the next with a short transition when the relationship is not obvious.
6. End with a `Summary` section that restates the key ideas and practical takeaway.

## Heading and section rules

Give every main heading a descriptive paragraph before any list, table, or code block. Headings should describe the idea being taught, not merely the implementation shape. Keep heading depth shallow and consistent; do not skip levels to create visual emphasis.

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

## Paragraph style

Prefer compact paragraphs of two to four sentences. Avoid long walls of text, but also avoid breaking every sentence into its own paragraph.

Use single-line paragraphs only for emphasis, formulas, or short transition lines.

## Examples and code

Introduce every example before the block and explain what the reader should notice afterward. Keep examples runnable or internally consistent with the surrounding explanation. Use fenced language identifiers for source code; use fenced `text` blocks for diagrams, formulas, or byte-level examples.

Prefer the smallest example that proves the current idea. Add a complete example only after the individual pieces have been explained. Avoid unrelated setup that hides the concept being taught.

## Lists and supporting content

Use lists after the section has already explained the idea.

Lists work well for:

- variants
- step summaries
- common mistakes
- practical rules
- final takeaways

Do not use lists as a replacement for explanation. A section made entirely of bullets, a table, or code is incomplete unless a preceding paragraph explains why that content matters.

## Blog tone and accuracy

Keep the writing descriptive and understandable without becoming shallow. Define technical terms at first use, prefer active voice, and explain trade-offs without pretending there is one universal solution. Keep claims scoped to the example and current project behavior; do not present guesses or future work as facts.

Prefer wording like:

- "You can think of this as..."
- "The important part is..."
- "In practice..."

Avoid unexplained jargon and avoid ending sections abruptly.

## Publication checklist

Before finishing, verify that the article has a clear audience and motivating problem, each section advances the explanation, examples match the prose, headings follow a consistent hierarchy, links use descriptive text and resolve correctly, and the summary reflects the article rather than introducing new concepts. Remove irrelevant tangents, repeated explanations, placeholder text, and claims unsupported by the referenced source.
