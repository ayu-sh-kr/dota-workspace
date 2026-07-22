---
name: scripting-tooling
description: Create and refactor repository utility scripts with Kotlin main.kts as the default, explicit types, class-based structure, warning-free diagnostics, and safe parallel execution. Use when adding task automation, validators, preview tools, generators, repository checks, or other scripts under tool-scripts/.
---

# Scripting and Tooling

Create maintainable repository utilities rather than disposable command snippets. Prefer standalone Kotlin Script files named `*.main.kts`, place them in `<workspace-root>/tool-scripts/`, and make them runnable from the workspace root with `kotlinc -script tool-scripts/<name>.main.kts`.

## Language choice

- Use Kotlin Script first for task automation, validation, preview, parsing, file operations, process orchestration, and local servers.
- Use Python or Bash only when Kotlin Script cannot provide the required integration or would materially reduce reliability. Record that reason beside the script or in its documentation.
- Keep repository utilities in `tool-scripts/`; keep `.agents/` for skills and direct skill resources.
- Use `*.main.kts` for executable scripts so Kotlin’s standard main-script definition and IntelliJ diagnostics apply consistently.
- Keep scripts self-contained unless a project dependency is explicitly required. Prefer JDK and Kotlin standard-library APIs for filesystem, XML, networking, processes, and concurrency.

## Structure and readability

- Declare explicit types for properties, local variables, function parameters, function return values, collections, process results, and public class members. Avoid relying on inference for domain data or boundary values.
- Model domain concepts with named `data class` types. Model orchestration and stateful behavior with regular classes that own their invariants and lifecycle.
- Replace `Pair`, `Triple`, anonymous object-shaped values, and unlabelled map entries with named types such as `data class ConnectorResult(...)` or `data class ProcessResult(...)`.
- Group parsing, validation, process execution, server lifecycle, and reporting into focused classes. Keep the script entry point small and explicit.
- Prefer named functions over long collection chains. Use loops when they make control flow, failure handling, or types clearer.
- Give every failure a useful message that includes the operation and relevant path, command, or identifier.
- Avoid mutable global state. Pass configuration into classes and close resources deterministically with `use`, `finally`, or an explicit lifecycle method.

## Concurrency and performance

- Identify independent work before parallelizing. Suitable candidates include independent file checks, card/connector audits, metadata scans, and unrelated process preparation.
- Use bounded `ExecutorService` or structured Kotlin concurrency with an explicit dispatcher when dependencies are available. Do not create an unbounded thread per item.
- Size pools from available processors with a sensible upper bound; preserve a minimum of two workers only when parallel work exists.
- Return typed results from workers and aggregate them deterministically by stable input index or identifier. Never let completion order change report output.
- Share immutable inputs across workers. Protect mutable collections or return a result from each worker and merge on the caller thread.
- Always shut down executors in `finally` and await termination briefly before returning.
- Do not parallelize dependent steps, tiny operations where scheduling dominates the work, or browser actions that require one ordered session.
- Preserve fail-fast behavior for unrecoverable setup errors while allowing independent audits to report all findings in one run.

## Validation workflow

1. Define configuration and domain data classes.
2. Implement focused classes for parsing, work execution, and reporting.
3. Add bounded parallelism only around independent expensive work.
4. Run the script with `kotlinc -script` and with `-Werror` when supported.
5. Inspect compiler diagnostics, output ordering, resource cleanup, and failure messages.
6. Run the smallest relevant project check and verify generated artifacts or side effects.

Typical commands:

```bash
kotlinc -Werror -script tool-scripts/<name>.main.kts
```

If a script uses a browser, external CLI, or local socket, distinguish compilation success from environment prerequisites such as a missing browser binary or blocked network permission.

## Handoff requirements

- Link the script from the owning project documentation when it is project-specific.
- Document required executables, environment variables, working directory, output locations, and concurrency behavior.
- Keep generated screenshots, logs, caches, and other transient outputs out of source control.
- State when Python or Bash was necessary and why Kotlin Script was insufficient.
