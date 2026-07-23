export const USER_CREATED_EVENT = 'user:created';
export const userUpdatedEvent = 'user:updated';
export const UserArchivedEvent = 'user:archived';
export const DIRECT_WRAPPED_EVENT = ('direct:wrapped' as const)!;
export const eventName = 'should:not:be:an:event:constant';
export const eventful = 'should:not:be:an:event:constant';
export const VALUE = 'should:not:be:an:event:constant';
export let LET_EVENT = 'should:not:be:an:event:constant';
export var VAR_EVENT = 'should:not:be:an:event:constant';

export class UserEvents {
  static readonly STATIC_EVENT = 'static:readonly';
  static staticCompatibilityEvent = 'static:compatibility';
  static CREATED = 'should:not:be:an:event:constant';
  instanceEvent = 'should:not:be:an:event:constant';
}

export {USER_CREATED_EVENT as ReExportedUserCreatedEvent};
