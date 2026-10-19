export const MEMBERSHIP_LIFECYCLE_LISTENER = Symbol(
  'MEMBERSHIP_LIFECYCLE_LISTENER',
);

export interface MembershipActivatedEvent {
  tenantId: string;
  userId: string;
  membershipId: string;
}

/**
 * In-process port (no event bus). Implementations must never throw out to the
 * membership write path — catch and log internally.
 */
export interface MembershipLifecycleListener {
  onMembershipActivated(event: MembershipActivatedEvent): Promise<void>;
}
