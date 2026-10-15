import {MetadataOwner, type MetadataTarget} from "@dota/metadata/metadata-owner.ts";
import {MetadataRecord} from "@dota/metadata/metadata-record.ts";

const records = new WeakMap<object, MetadataRecord>();

/**
 * Entry point of the metadata layer.
 *
 * `Metadata.for` accepts a class, a prototype (legacy member decorators), an instance (lifecycle
 * code), or a standard decorator context, and returns the owning class's record.
 *
 * @example
 * Metadata.for(target).add(PROPERTIES, 'title', details);   // inside a decorator
 * Metadata.for(this).get(PROPERTIES);                        // inside a component
 */
export const Metadata = {
  /**
   * Returns the long-lived record of the owner of `target`, creating it on first use.
   * One record exists per owner, so callers may hold it instead of resolving again.
   * @param target Class, prototype, instance, standard decorator context, or metadata object.
   * @returns The owner's record.
   * @throws TypeError when a standard context has no metadata because `Symbol.metadata` is missing.
   */
  for(target: MetadataTarget): MetadataRecord {
    const owner = MetadataOwner.resolve(target);
    let record = records.get(owner);
    if (!record) {
      record = new MetadataRecord(owner);
      records.set(owner, record);
    }
    return record;
  },
} as const;
