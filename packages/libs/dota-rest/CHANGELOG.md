# @ayu-sh-kr/dota-rest

## 1.1.5

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project

## 1.1.4

### Patch Changes

- 2e89848: Reconfigured the project structure and bring all the projects under the common umbrella.

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

## 1.1.3

### Patch Changes

- 3802ca9: Fix URLSearchParam not available in browser issue

## 1.1.2

### Patch Changes

- a376385: removed editorconfig from build

## 1.1.1

### Patch Changes

- d31eedf: added backward compatibility for RestClient changes

## 1.1.0

### Minor Changes

- 615e964: Refactored whole project to handle issue with fluent api, enhance the developer experience with RestClient and ensure error less requests

## 1.0.10

### Patch Changes

- b89c031: change for interop

## 1.0.9

### Patch Changes

- 8d49948: Modify the build to support project using commonjs and es modules

## 1.0.8

### Patch Changes

- 56e9362: Add converter to map json data as the user wants, giving more control over the api response

## 1.0.7

### Patch Changes

- bf71574: Added response handler to manage the response for various status code

## 1.0.6

### Patch Changes

- e38a5ab: added test coverage and introduced minor feature for to add timeout to the `RestClient`

## 1.0.5

### Patch Changes

- aea93b9: fix toEntity method to handle the data type conversion inorder avoid failure when response is not of the type of json

## 1.0.4

### Patch Changes

- 975a95c: implemented ResponseVoid and enhanced the docs

## 1.0.3

### Patch Changes

- 8aa0e1f: Fix build issue where, codes where hidden upon import to other project

## 1.0.2

### Patch Changes

- 9f93d32: Fix build issue and structure the build files

## 1.0.1

### Patch Changes

- a27a406: Added docs for the project

## 1.0.0

### Major Changes

- fc0f1c0: Build the RestClient to reduce the burden on repeatetice writing fetch requests.
