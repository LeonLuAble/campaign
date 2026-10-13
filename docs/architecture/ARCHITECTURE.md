# Architecture
Decision: **Modular Monolith + Event-Ready**. Do NOT deploy microservices initially.

Stack:
- Flutter/Dart mobile
- Flutter Web admin
- NestJS/TypeScript backend
- PostgreSQL
- Redis
- S3-compatible storage
- REST/JSON
- Docker

Logical modules:
Identity, Customers, Communities, Memberships, Authorization, User Import, Campaigns, Participation, Actions, Commitments, Goals, Progress, Milestones, Measurements, Outcomes, Visualizations, Notifications, Localization, Audit.

Modules must not directly access each other's repositories/tables arbitrarily. Use application services, interfaces and domain events.

Events start in-process:
UserImported, UserActivated, MembershipCreated, MembershipRoleChanged, CampaignCreated, CampaignPublished, CampaignStarted, CampaignCompleted, ParticipationCreated, ParticipationWithdrawn, CommitmentCreated, CommitmentUpdated, ActionRecorded, ActionCancelled, AchievementUpdated, ProgressUpdated, MilestoneAchieved, MilestoneEvaluated, MeasurementRecorded, OutcomeCalculated, NotificationCreated.

Event envelope: eventId, eventType, eventVersion, occurredAt, tenantId, aggregateId, payload.
Do not publish before transaction commit. Add transactional outbox only when reliable async/external delivery is actually required.

Future microservice extraction requires evidence: independent scaling/deployment, strong ownership, workload isolation or technology/runtime need.

Security:
- secure password hashing
- short-lived access tokens
- refresh token rotation/revocation as appropriate
- hashed invitation/reset tokens
- least privilege
- tenant isolation
- audit sensitive operations
- secrets outside source

Privacy: PRIVATE, GROUP, COMMUNITY, CUSTOMER, PUBLIC.
Localization: en and zh-Hans; no name_en/name_zh fields.
Observability: structured logs, correlation ID, health/readiness, audit and useful metrics.

Final principle: **Start simple. Design deeply. Scale deliberately.**
