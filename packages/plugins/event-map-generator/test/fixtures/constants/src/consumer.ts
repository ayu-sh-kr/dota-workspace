import {OnEvent} from '@ayu-sh-kr/dota-wrap/event';
import {
  DIRECT_WRAPPED_EVENT,
  UserArchivedEvent as ARCHIVED,
  USER_CREATED_EVENT,
  UserEvents,
  userUpdatedEvent as UPDATED,
} from './events.ts';
import {ReExportedUserCreatedEvent as REEXPORTED_CREATED} from './re-exports.ts';
import {ReExportedUserUpdatedEvent as REEXPORTED_UPDATED} from './re-exports.ts';

declare const publisher: {
  publish(event: {name: string; data?: unknown}): void;
  publishAsync(event: {name: string; data?: unknown}): Promise<void>;
  emit(event: {name: string; data?: unknown}): void;
};

export class ConstantFeature {
  @OnEvent(USER_CREATED_EVENT)
  handleCreated() {}

  @OnEvent(UPDATED)
  handleUpdated() {}

  @OnEvent(ARCHIVED)
  handleArchived() {}

  @OnEvent(REEXPORTED_CREATED)
  handleReExportedCreated() {}

  publishEvents() {
    publisher.publish({name: UserEvents.STATIC_EVENT});
    publisher.publishAsync({name: UserEvents.staticCompatibilityEvent});
    publisher.emit({name: DIRECT_WRAPPED_EVENT});
    publisher.publish({name: REEXPORTED_UPDATED});
  }
}
