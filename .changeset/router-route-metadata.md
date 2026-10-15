---
"@ayu-sh-kr/dota-router": minor
---

`@Route` configuration is now stored in dota-core's metadata layer under the exported `RouterMetadata.route` key, instead of `reflect-metadata`.

- Read a page's route with `Metadata.for(Page).own(RouterMetadata.route)`. Code that read `Reflect.getOwnMetadata('Route', Page)` must switch to this.
- A subclass of a routed page is still not a route itself. `RouterUtils.prepareConfig` reads only each class's own route.
- Route rendering reads `@Component` configuration through the metadata layer.
