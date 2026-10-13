# AI HANDOVER — Community Campaign Platform

## Purpose
This is the orchestration contract for handing the project to an AI agent such as Grok Bot, which can coordinate Cursor as the coding executor.

## Current State
Project: Community Campaign Platform.
First customer/founding partner: Tzu Chi Malaysia.
First campaign: 速素数数.
Current architecture: Modular Monolith + Event-Ready.
Current stack: Flutter/Dart, Flutter Web, NestJS/TypeScript, PostgreSQL, Redis, S3-compatible storage, REST/JSON, Docker.

Phase 0 (repository foundation) is complete.
Phase 1 (Identity + Authentication) is complete: users, identities, credentials, social identities, refresh tokens, email/mobile password login, Google/Apple authentication boundary, registration, activation, password reset, secure token handling, migrations, and tests.
Phase 2 (Customer/community/membership/authorization) is complete: `tenants` (API: customers), arbitrary-depth `community_nodes`, memberships, tenant-scoped roles, a global permission catalog, backend guards/policies, tenant isolation tests, additive TypeORM migrations, and API contracts. Customer creation is restricted to platform admins (`users.is_platform_admin`). `npm run seed:tzu-chi` (from `apps/api`) promotes an existing user by email and creates Tzu Chi Malaysia if missing.
Phase 3 (User import/activation) is complete: tenant-admin CSV import (`/user-imports` upload → mapping → validate → preview → confirm → per-row results), identities and memberships created through IdentityAccountService and MembershipService, phone normalization via CredentialService (default region MY), activation invitations via existing NotificationSender and activation tokens, imported users activate by setting a password on `POST /auth/activate`, additive `user_imports` / `user_import_rows` migrations, and tenant-isolation tests.

Next phase: Phase 4 — Campaign foundation.

## Canonical Documents
1. PRODUCT_VISION.md
2. DOMAIN_MODEL.md
3. MVP_SPECIFICATION.md
4. DATABASE.md
5. API_SPEC.md
6. ARCHITECTURE.md
7. PROJECT_STRUCTURE.md
8. CURSOR_DEVELOPMENT_GUIDE.md

Read these before making architectural or domain decisions.

## Settled Decisions
- Customer is API/UI terminology; Tenant is DB/system terminology.
- MVP has `tenants`, not duplicate customers+tenants tables.
- Identity is separate from authentication.
- Support email/password, mobile/password, Google and Apple.
- Never put provider IDs or password hashes directly on users.
- Community hierarchy is arbitrary depth.
- Users connect to communities through Membership.
- Roles grant permissions; Tags describe attributes and never grant permissions.
- Template -> Scope -> Campaign -> Configuration.
- Vegetarianism is a campaign scope, not platform infrastructure.
- Completion is achieved/target*100 and is not capped.
- Historical actions/outcomes are preserved.
- Impact factors are versioned/source-attributed.
- Initial architecture is not microservices.
- No Kafka/RabbitMQ/Kubernetes for MVP without explicit approval.
- Only platform admins may create customers. Platform admin is `users.is_platform_admin` (default false), a platform-level flag, not a tenant role. It grants no implicit cross-tenant data access beyond `POST /customers`. Optional `initialAdminUserId` receives the seeded `tenant_admin` membership; if omitted, the creating platform admin becomes `tenant_admin`.

## Immediate Development Path
If Phase 0 is not complete, finish Phase 0 first.
If Phase 0 is complete and verified, start Phase 1: Identity + Authentication.

Phase 1:
- users
- user_identities
- user_credentials
- user_social_identities
- refresh_tokens
- email/mobile password login
- Google/Apple authentication boundary
- activation
- password reset
- secure token handling
- migrations
- tests

Do not implement campaign, vegetarian business logic, community or import during Phase 1.
Do not implement user import, invitations, campaigns, or vegetarian logic during Phase 2.
Do not implement campaigns or vegetarian logic during Phase 3.

## Orchestration Workflow
1. Read canonical docs.
2. Inspect repository and current git state.
3. Determine exact current phase.
4. Break work into small Cursor tasks.
5. Give Cursor precise task + constraints + verification.
6. Review Cursor changes.
7. Run build/lint/test/integration checks.
8. Reject architecture drift.
9. Update docs only when behavior/architecture genuinely changes.
10. Commit coherent work.
11. Record completed phase and next task.
12. Continue.

Do not blindly accept AI-generated code.

## Architecture Drift to Reject
- microservices introduced without evidence
- Kafka/RabbitMQ/Kubernetes introduced prematurely
- cross-module repository bypass
- business logic in controllers/Flutter
- client-trusted tenant authorization
- provider IDs/password hashes on users
- hardcoded vegetarian logic in generic modules
- hardcoded impact factors
- deletion/reset of historical actions/outcomes
- ORM auto-sync in production
- speculative abstractions

## Verification Gate
Backend: build, lint, unit tests, relevant integration/API tests.
Flutter: analyze, tests, build/run where practical.
Infrastructure: PostgreSQL, Redis, migrations, health endpoint.
Also verify security, tenant isolation, authorization and absence of secrets.

## Human Escalation
Ask the human before changing:
- core architecture
- identity model
- tenant model
- destructive DB migrations
- privacy semantics
- authorization semantics
- major infrastructure
- material MVP scope

Do not ask about trivial implementation choices already covered by the canonical documents.

## Working Style
The human is an experienced software/technology leader and wants practical implementation rather than endless architecture discussion. AI should accelerate development, not accelerate architectural mistakes.

## Final Principle
**Build fast. Verify continuously. Escalate meaningful decisions.**
