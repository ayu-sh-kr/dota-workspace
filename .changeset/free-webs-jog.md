---
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-core": patch
"@ayu-sh-kr/dota-rest": patch
"@ayu-sh-kr/dota-wrap": patch
---

Reconfigured the project structure and bring all the projects under the common umbrella.

### Patch Changes
- Updated dependencies to the latest versions.
- Fixed minor bugs in the routing module.
- Improved performance of the core library.
- Enhanced REST API handling.
- Refactored codebase for better maintainability.

### Changes Dota Router
- Fix the routing algorithm to capture the routes correctly when auto-configured using the `@Route` decorator.
- Route tree building improved to handle nested routes more efficiently.


### Changes Dota Core
- No significant changes, just dependency updates and minor bug fixes.


### Changes Dota Rest
- No significant changes, just dependency updates and minor bug fixes.


### Changes Dota Wrap
- Added new project to encapsulate common utilities and helpers for Dota-related projects.
- Allows for building advance web applications with Dota ecosystem.
- Packed with useful utilities to build web component, define routes, handle rest api calls, and manage state effectively.
- Improved overall project structure for better scalability and maintainability.


### Overall Improvements
- Reorganized the project structure to have a monorepo setup.
- Improved build and deployment processes.
- Enhanced documentation for better developer experience.
