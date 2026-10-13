# API Specification
Base: `/api/v1`; REST/JSON; camelCase JSON; UUIDs; ISO timestamps; stable error codes.

Auth:
- POST /auth/register (identifier=email or mobile + password) → 201 `{ id, identifier, type }`
- POST /auth/login (identifier=email or mobile + password)
- POST /auth/social `{ provider: 'google' | 'apple', idToken }` → 200 `{ accessToken, refreshToken }`
- POST /auth/refresh
- POST /auth/logout
- GET /me
- POST /auth/activate `{ token, password? }` → 204; idempotent if already verified. `password` is required when the account has no credential (imported users); ignored when a password already exists.
- POST /auth/activate/resend `{ identifier }` → 202 `{ accepted: true }`
- POST /auth/password-reset/request `{ identifier }` → 202 `{ accepted: true }` (no enumeration)
- POST /auth/password-reset/confirm `{ token, password }` → 204

Auth error codes include `INVALID_CREDENTIALS`, `SOCIAL_TOKEN_INVALID`, `TOKEN_INVALID`, `TOKEN_REUSED`, `TOKEN_EXPIRED`, `IDENTITY_ALREADY_EXISTS`, and `WEAK_PASSWORD`.
Password policy: minimum 8 characters (configurable via `PASSWORD_MIN_LENGTH`).

Customer: `/customers`
- POST /customers `{ name, initialAdminUserId? }` → 201. Platform-admin only (`users.is_platform_admin`); other authenticated users get 403 `FORBIDDEN`. Platform admin is a platform-level user flag, not a tenant role, and grants no implicit access to customer data beyond create.
- `initialAdminUserId` (optional UUID) is the user who receives the seeded `tenant_admin` membership. If omitted, the creating platform admin becomes `tenant_admin`. The creator is not added as a member when a different `initialAdminUserId` is supplied.
- GET /customers → tenants the caller has an active membership in (no `customers.read` required)
- GET /customers/:customerId → requires `customers.read` in that tenant; missing membership is 404
- PATCH /customers/:customerId `{ name?, isActive? }` → requires `customers.update` and a tenant-level membership

Bootstrap (idempotent, no hardcoded credentials): from `apps/api`, `npm run seed:tzu-chi -- --email existing-user@example.com` (or `SEED_ADMIN_EMAIL`) promotes that existing user to platform admin and creates `Tzu Chi Malaysia` if it does not already exist.

Communities: `/communities`
Membership/roles/permissions: `/memberships`, `/roles`, `/permissions`

User import: `/user-imports` (tenant-scoped via `customerId` query; requires `user_imports.create` / `user_imports.read`)
- POST /user-imports (multipart `file`, query `customerId`, optional query `communityId`) → upload CSV
- PATCH /user-imports/:userImportId/mapping `{ mapping }` → map CSV headers to canonical fields
- POST /user-imports/:userImportId/validate → per-row validation without writes
- GET /user-imports/:userImportId/preview → validated per-row preview
- POST /user-imports/:userImportId/confirm → create identities/memberships, assign the tenant system `member` role, and send activation invitations
- GET /user-imports, GET /user-imports/:userImportId, GET /user-imports/:userImportId/rows → list/summary/result errors

Imported users activate through POST /auth/activate with a password. Invitation delivery reuses the existing activation token + NotificationSender path (no `/invitations` resource in this phase).

Campaign (tenant-scoped via `customerId` query/body or resource id; generic configuration, no vegetarian schema in this module):
- POST /campaign-templates `{ customerId, key?, name, description? }` → 201. Requires `campaign_templates.create`.
- GET /campaign-templates?customerId= → requires `campaign_templates.read`
- GET /campaign-templates/:templateId → requires `campaign_templates.read`
- PATCH /campaign-templates/:templateId `{ name?, description?, isActive? }` → requires `campaign_templates.update`
- POST /campaign-scopes `{ customerId, templateId, key?, name, description? }` → 201. Requires `campaign_scopes.create`.
- GET /campaign-scopes?customerId=&templateId? → requires `campaign_scopes.read`
- GET /campaign-scopes/:scopeId → requires `campaign_scopes.read`
- PATCH /campaign-scopes/:scopeId `{ name?, description?, isActive? }` → requires `campaign_scopes.update`
- POST /campaigns `{ customerId, templateId, scopeId, name, timezone, description?, startsOn?, endsOn?, communityIds?, configuration? }` → 201 draft. Requires `campaigns.create`.
- GET /campaigns?customerId= → requires `campaigns.read`
- GET /campaigns/:campaignId → requires `campaigns.read`
- PATCH /campaigns/:campaignId → draft only; requires `campaigns.update`
- POST /campaigns/:campaignId/publish|start|complete → one-step forward lifecycle; requires `campaigns.update`
- GET/PUT /campaigns/:campaignId/configuration `{ settings }` → GET `campaigns.read`; PUT draft only, `campaigns.update`
- GET/PUT /campaigns/:campaignId/communities `{ communityIds }` → empty list means tenant-wide; PUT draft only

Participation:
- POST /campaigns/:campaignId/participations `{ userId? }` → 201. Omitting `userId` (or passing the caller’s id) is self-enroll: any authenticated user with an active, eligible membership may join a published or started campaign. Enrolling another user requires `participations.create`. Target user must be an active tenant member in a targeted community (or any membership if tenant-wide).
- GET /campaigns/:campaignId/participations → requires `participations.read`. Members see only their own row; tenant admins see all.
- GET /participations/:participationId → requires `participations.read`
- POST /participations/:participationId/withdraw → self-withdraw is allowed for the participant. Withdrawing another user requires `participations.update`. Idempotent if already withdrawn. Re-enroll restores the same row.

Actions (tenant-scoped via campaign/participation/action ids; generic recording, no vegetarian schema in this module):
- POST /campaigns/:campaignId/action-definitions `{ key?, name, unit, description?, settings? }` → 201. Requires `action_definitions.create`.
- GET /campaigns/:campaignId/action-definitions → requires `action_definitions.read`
- GET /action-definitions/:actionDefinitionId → requires `action_definitions.read`
- PATCH /action-definitions/:actionDefinitionId → requires `action_definitions.update`; locked after campaign completion
- POST /actions `{ participationId, actionDefinitionId, occurredOn?, quantity?, privacyLevel?, idempotencyKey?, payload? }` → 201. Members record only their own participation (`actions.create`). Recording for another user requires `actions.update`. `occurredOn` is a campaign-timezone calendar date and defaults to today in that timezone; future dates are rejected. Duplicate recorded (participation, definition, day) is 409. Reusing `idempotencyKey` with the same payload returns the original action.
- GET /campaigns/:campaignId/actions → requires `actions.read`. Members see only their own rows; `actions.update` sees all. Privacy is stored (default `private`) but does not expand member visibility in this phase.
- GET /participations/:participationId/actions → requires `actions.read`
- GET /actions/:actionId → requires `actions.read`
- PATCH /actions/:actionId → admin correction; requires `actions.update`
- POST /actions/:actionId/cancel → owner may cancel their own row; cancelling another user requires `actions.update`. Cancel is idempotent and preserves the row (`status=cancelled`). A new recorded action may then be created for that day.
- GET /actions/:actionId/submissions → requires `submissions.read`. Recording an action also creates a submission. Campaign configuration `submissionReview` is `'auto'` (default) or `'manual'`. Auto mode creates the submission as `approved` with `reviewedByUserId` null and `reviewedAt` set. Manual mode creates `submitted` and waits for review.
- POST /submissions/:submissionId/approve|reject `{ note? }` → requires `submissions.update`. Admins may reject auto-approved submissions. Phase 6 progress must count only `approved` submissions on non-cancelled actions.

Commitments:
- POST /participations/:participationId/commitments `{ typeKey?, targetValue, unit, payload? }` → 201 create-or-replace (one commitment per participation). Members may pledge only on their own enrolled participation (`commitments.create`). Acting on another user requires `commitments.update`. Allowed while the campaign is published or started.
- GET /participations/:participationId/commitments → requires `commitments.read`. Members see only their own.
- GET /commitments/:commitmentId → requires `commitments.read`
- PATCH /commitments/:commitmentId → admin correction; requires `commitments.update`

Vegetarian campaign rules (速素数数) are not hardcoded in commitments/actions. Campaigns with `configuration.rulesStrategy = "vegetarian"` are validated by the vegetarian module (seven choices, days/meals units).
Goals: `/goals`
Achievements: campaign/participant endpoints
Progress: participant/community/campaign endpoints
Milestones: create/list/progress/evaluate/evaluations
Measurement/Outcome/Impact: definitions, measurements, factors, outcomes
Visualization: campaign visualization and data
Dashboards/reports: participant/group/community/campaign
Notifications, localization, audit.

Authorization must enforce authentication, tenant scope, permission, community scope, privacy and ownership where applicable. Never trust client-supplied tenantId.
