import {MetadataKey} from "@ayu-sh-kr/dota-core";
import type {RouteConfig} from "@dota/Types";

/**
 * Metadata keys owned by dota-router. Scoped keys keep route metadata separate from dota-core's
 * component metadata while sharing its inheritance-aware storage.
 */
export const RouterMetadata = {
  /** `@Route` configuration of a page component; read as the class's own value, never inherited. */
  route: MetadataKey.value<RouteConfig<HTMLElement>>('dota.router.route'),
} as const;
