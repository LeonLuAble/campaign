# API Specification
Base: `/api/v1`; REST/JSON; camelCase JSON; UUIDs; ISO timestamps; stable error codes.

Auth:
- POST /auth/register (identifier=email or mobile + password) → 201 `{ id, identifier, type }`. Issues an activation token and sends bilingual email (`en` / `zh-Hans` from the user locale) when the channel is email. The message links to `${PUBLIC_WEB_BASE_URL}/activate?token=…`. SMTP delivery failures are logged without the token and do not fail the request; the token remains resendable.
- POST /auth/login (identifier=email or mobile + password)
- POST /auth/social `{ provider: 'google' | 'apple', idToken }` → 200 `{ accessToken, refreshToken }`
- POST /auth/refresh
- POST /auth/logout
- GET /me (`isPlatformAdmin` is included so admin clients can show customer creation without guessing)
- POST /auth/activate `{ token, password? }` → 204; idempotent if already verified. `password` is required when the account has no credential (imported users); ignored when a password already exists.
- POST /auth/activate/resend `{ identifier }` → 202 `{ accepted: true }`
- POST /auth/password-reset/request `{ identifier }` → 202 `{ accepted: true }` (no enumeration). Email links use `${PUBLIC_WEB_BASE_URL}/reset-password?token=…`.
- POST /auth/password-reset/confirm `{ token, password }` → 204

First-admin setup (public; disabled unless `SETUP_KEY` is set to at least 32 characters):
- GET /setup/status → `{ setupRequired: boolean }`. `true` only when no platform admin exists **and** `SETUP_KEY` is configured. Once an admin exists, the API may cache `setupRequired: false` in memory.
- POST /setup/admin `{ setupKey, email, password, displayName? }` → 200 `{ accessToken, refreshToken }` (same token pair as login). Creates the first platform admin with a verified email identity and credential inside one transaction guarded by `pg_advisory_xact_lock`. Uses the auth throttler with a tighter per-route limit (5 requests / 60s when rate limiting is enabled).

Auth error codes include `INVALID_CREDENTIALS`, `SOCIAL_TOKEN_INVALID`, `TOKEN_INVALID`, `TOKEN_REUSED`, `TOKEN_EXPIRED`, `IDENTITY_ALREADY_EXISTS`, `WEAK_PASSWORD`, `SETUP_NOT_AVAILABLE` (409 when setup is disabled or an admin already exists), and `INVALID_SETUP_KEY` (401).
Password policy: minimum 8 characters (configurable via `PASSWORD_MIN_LENGTH`).

Customer: `/customers`
- POST /customers `{ name, initialAdminUserId?, initialAdmin?: { email, displayName?, locale? } }` → 201. Platform-admin only (`users.is_platform_admin`); other authenticated users get 403 `FORBIDDEN`. Platform admin is a platform-level user flag, not a tenant role, and grants no implicit access to customer data beyond create. Provide either `initialAdminUserId` or `initialAdmin`, not both (400 if both).
- `initialAdminUserId` (optional UUID) is an existing active user who receives the seeded `tenant_admin` membership. If both admin fields are omitted, the creating platform admin becomes `tenant_admin`. The creator is not added as a member when a different admin is supplied.
- `initialAdmin` (optional) finds or creates the user by email in the same transaction as the tenant, roles, and `tenant_admin` membership. After commit: new or unverified users receive an activation email (F4 SMTP + `${PUBLIC_WEB_BASE_URL}/activate?token=…`); the 201 body may still include `activationToken` for out-of-band sharing. Active verified users receive a `customer_added` notice (no token). Email/send failures are logged without tokens and do not roll back the customer (activation remains resendable).
- GET /customers → tenants the caller has an active membership in (no `customers.read` required)
- GET /customers/:customerId → requires `customers.read` in that tenant; missing membership is 404
- GET /customers/:customerId/access → `{ roles: [{id,key,name}], permissionKeys: string[], isTenantLevel: boolean, communityIds: string[] }` for the calling user in that customer. Any active membership is enough (no extra permission key). Non-members and platform admins who are not members get 404. `communityIds` lists the caller's community-scoped membership roots (not descendants).
- PATCH /customers/:customerId `{ name?, isActive? }` → requires `customers.update` and a tenant-level membership

Platform console (platform-admin only; metadata only — no tenant data without membership):
- GET /platform/customers → `[{ id, name, slug, isActive, createdAt, adminCount, pendingAdminInvites }]`. Lists all customers. `adminCount` / `pendingAdminInvites` count active memberships with the system `tenant_admin` role (`pending` = no verified identity).
- POST /platform/customers/:customerId/admins `{ email, displayName?, locale? }` → 201 `{ customerId, userId, email, activationStatus, activationToken? }`. Invites another `tenant_admin` (find-or-create by email). Same post-commit activation / `customer_added` notice rules as `initialAdmin`.
- POST /platform/customers/:customerId/admins/:userId/resend → 202 `{ accepted: true }`. Resends activation for that customer admin (no-op safe if already verified).

Bootstrap (idempotent, no hardcoded credentials): from `apps/api`, `npm run seed:tzu-chi -- --email existing-user@example.com` (or `SEED_ADMIN_EMAIL`) promotes that existing user to platform admin and creates `Tzu Chi Malaysia` if it does not already exist.

Communities: `/communities`
Membership/roles/permissions: `/memberships`, `/roles`, `/permissions`

Membership directory (B1 / B-API-4):
- GET /memberships?customerId&q&communityId&includeDescendants&roleKey&status&limit&cursor → `{ items, nextCursor }` with `memberships.read`. Default `limit` 50 (max 100). Cursor is opaque. Each item includes `user: { id, displayName, email?, mobile?, activationStatus: 'pending'|'active' }`, `community: { id, name } | null`, and `roles`. `activationStatus` is `active` when the user has at least one verified identity, otherwise `pending`. Community-scoped callers see only memberships in their visible subtree; tenant-level callers see the whole tenant. `email` / `mobile` are included only for tenant-level callers (omitted for community-scoped callers). Members without `memberships.read` get 403 (after F1).

Membership invitations (B6 / B-API-6 / B-API-7):
- POST /memberships/invitations `{ customerId, email?, mobile?, displayName?, communityId?, roleKeys? }` → 201. Requires `memberships.create`. At least one of `email` or `mobile`. Finds or creates the user (IdentityAccountService), finds or creates the membership (idempotent per identifier + community), and assigns `roleKeys` (default `['member']`). Email invites send the F4 activation email. Mobile-only invites do not send SMS; the 201 body includes a one-time `activationLink` (24 h TTL via `ACTIVATION_TOKEN_TTL_SECONDS`) shown once; structured logs record issuance without the token. Community-scoped callers may invite only into their visible subtree, cannot omit `communityId`, cannot assign `tenant_admin`, and cannot assign roles whose permissions exceed their own.
- POST /memberships/:membershipId/resend-activation → 202 `{ accepted: true, activationLink? }` with `memberships.update`. Resends email activation, or issues a new one-time link for mobile-only users. 409 if the user is already active (`activationStatus === 'active'`).

System `member` role (F1 / F-SEC-1): seeded with an explicit allow-list — `customers.read`, `communities.read`, `campaigns.read`, `campaign_templates.read`, `campaign_scopes.read`, `action_definitions.read`, `participations.read`, `actions.read`, `submissions.read`, `commitments.read`, `progress.read`, `achievements.read`, `milestones.read`, `measurement_definitions.read`, `measurements.read`, `impact_factors.read`, `outcomes.read`, `visualizations.read`, `dashboards.read`, `notifications.read`, `reports.read`, plus self-create `commitments.create`, `actions.create`, and `notifications.update`. It does **not** receive `memberships.read`, `roles.read`, or `user_imports.read` (import rows contain email, mobile, and raw CSV). Member-visible list endpoints that return `userId` remain self-scoped; campaign/community aggregates and reports omit contact PII. `tenant_admin` retains the full permission catalog.

User import: `/user-imports` (tenant-scoped via `customerId` query; requires `user_imports.create` / `user_imports.read`; tenant admins only — members get 403)
- POST /user-imports (multipart `file`, query `customerId`, optional query `communityId`) → upload CSV
- PATCH /user-imports/:userImportId/mapping `{ mapping }` → map CSV headers to canonical fields (`email`, `mobile`, `externalId`, `firstName`, `lastName`, `displayName`, `communityId`, `communityPath`)
- POST /user-imports/:userImportId/validate → per-row validation without writes. Canonical `communityPath` (e.g. `Region/Branch`) resolves by exact name path from the tenant root; unknown paths → row error `UNKNOWN_COMMUNITY_PATH` and do not create communities. Existing `communityId` UUID mapping and default `communityId` query still work (`communityPath` wins when both are present on a row).
- GET /user-imports/:userImportId/preview → validated per-row preview
- POST /user-imports/:userImportId/confirm → create identities/memberships, assign the tenant system `member` role, and send activation invitations
- GET /user-imports, GET /user-imports/:userImportId, GET /user-imports/:userImportId/rows → list/summary/result errors

Imported users activate through POST /auth/activate with a password. Invitation delivery reuses the existing activation token + NotificationSender path (SMTP when configured; tokens never logged).

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
- GET `/campaigns/:campaignId/commitment-options` → requires `commitments.read`. Returns the campaign rule strategy’s pledge choices, units, suggested targets, and whether the target uses campaign duration. Vegetarian campaigns (`rulesStrategy = "vegetarian"`) return the seven 速素数数 choices. Generic campaigns return empty `choices`. Flutter must not hardcode choice catalogs.
- POST /participations/:participationId/commitments `{ typeKey?, targetValue, unit, payload? }` → 201 create-or-replace (one commitment per participation). Members may pledge only on their own enrolled participation (`commitments.create`). Acting on another user requires `commitments.update`. Allowed while the campaign is published or started.
- GET /participations/:participationId/commitments → requires `commitments.read`. Members see only their own.
- GET /commitments/:commitmentId → requires `commitments.read`
- PATCH /commitments/:commitmentId → admin correction; requires `commitments.update`

Vegetarian campaign rules (速素数数) are not hardcoded in commitments/actions. Campaigns with `configuration.rulesStrategy = "vegetarian"` are validated by the vegetarian module (seven choices, days/meals units). Choice-to-target mapping for progress (including 已全素 campaign-duration days) also lives in that module.

Progress (computed from source on read; counts only `approved` submissions on non-cancelled actions; campaign timezone calendar days on `occurredOn`):
- GET `/participations/:participationId/progress` → requires `progress.read`. Members see only their own participation.
- GET `/participations/:participationId/achievement` → requires `achievements.read`. Members see only their own actual result.
- GET `/campaigns/:campaignId/progress` → requires `progress.read`. Aggregate totals by unit only; never includes user or participation ids.
- GET `/campaigns/:campaignId/communities/:communityId/progress` → requires `progress.read` and visibility of that community. Subtree = the node plus descendants. Tenant-level participations with a null community are omitted from community aggregates.
- GET `/campaigns/:campaignId/achievements` → requires `achievements.read`. Members receive only their own row; callers with `actions.update` or `participations.update` receive all rows in the tenant campaign.

Completion is `achieved / target * 100` and is not capped. Status: `none` (no target), `not_started`, `in_progress`, `achieved` (exactly 100%), `exceeded` (>100%).

Milestones (campaign-scoped stage targets; evaluation is an explicit admin action and never deletes history):
- POST `/campaigns/:campaignId/milestones` `{ key?, name, description?, metric: 'completion_percent' | 'achieved_value', thresholdValue, unit }` → 201. Requires `milestones.create` and a tenant-level membership.
- GET `/campaigns/:campaignId/milestones` → requires `milestones.read`
- GET `/milestones/:milestoneId` → requires `milestones.read`
- PATCH `/milestones/:milestoneId` → requires `milestones.update`
- GET `/milestones/:milestoneId/progress` → live campaign aggregate vs the threshold; no individual rows
- POST `/milestones/:milestoneId/evaluate` → requires `milestones.evaluate`; appends an evaluation snapshot and upserts `milestone_progress`
- GET `/milestones/:milestoneId/evaluations` → append-only history

Goals: `/goals` (not implemented; participant targets are commitments)
Measurement definitions (campaign-scoped source units that may be converted):
- POST `/campaigns/:campaignId/measurement-definitions` `{ key?, name, sourceUnit, description? }` → 201. Requires `measurement_definitions.create` and a tenant-level membership.
- GET `/campaigns/:campaignId/measurement-definitions` → requires `measurement_definitions.read`
- GET `/measurement-definitions/:measurementDefinitionId` → requires `measurement_definitions.read`
- PATCH `/measurement-definitions/:measurementDefinitionId` → requires `measurement_definitions.update`

Impact factors (versioned, source-attributed, effective-date aware; campaign row overrides tenant-wide for the same source unit + outcome metric on that date):
- POST `/impact-factors` `{ customerId, campaignId?, sourceUnit, outcomeMetric, outcomeUnit, factorValue, source, effectiveFrom, effectiveTo? }` → 201 tenant-wide when `campaignId` is omitted. Requires `impact_factors.create` and a tenant-level membership. `source` is a required citation. `factorValue` is never platform-defaulted.
- POST `/campaigns/:campaignId/impact-factors` → 201 campaign-scoped version
- GET `/impact-factors?customerId=&campaignId?` and GET `/campaigns/:campaignId/impact-factors` → requires `impact_factors.read`. Campaign list includes tenant-wide rows plus campaign overrides.
- GET `/impact-factors/:impactFactorId` → requires `impact_factors.read`
- PATCH `/impact-factors/:impactFactorId` `{ source?, effectiveTo?, isActive? }` → requires `impact_factors.update`. `factorValue`, units, metric and version are immutable; a new POST creates the next version. Open previous versions are closed when a later version is created.

Measurements and outcomes are computed on read from approved submissions on non-cancelled actions (same counting rule as Phase 6). Raw action quantities in a defined source unit are converted with the factor that was effective on `occurredOn`. Historical factor versions are returned on each outcome contribution. No `measurements` or `outcomes` projection tables.
- GET `/participations/:participationId/measurements` → requires `measurements.read`. Members see only their own.
- GET `/participations/:participationId/outcomes` → requires `outcomes.read`. Members see only their own.
- GET `/campaigns/:campaignId/measurements` and `/outcomes` → anonymous unit totals; never includes user or participation ids.
- GET `/campaigns/:campaignId/communities/:communityId/measurements` and `/outcomes` → subtree = node plus descendants; tenant-level participations with a null community are omitted.

Visualization (generic `tree` type only; display name such as 素心树 lives in settings, not as a domain class):
- GET/PUT `/campaigns/:campaignId/visualization` `{ type: 'tree', settings? }` → GET `visualizations.read`; PUT `visualizations.update` (create-or-replace), tenant-level membership required to write.
- GET `/campaigns/:campaignId/visualization/data` → campaign aggregate completion for TREE display. Missing config still returns type `tree` with `isActive: false`.

Dashboards (compose progress, measurements, outcomes, campaign-local day/week time series, and TREE data). Query `granularity=day|week` (default `day`). Week buckets are ISO weeks starting Monday in the campaign timezone. No public unauthenticated sharing. No rankings.
- GET `/participations/:participationId/dashboard` → requires `dashboards.read`. Members see only their own.
- GET `/campaigns/:campaignId/dashboard` → requires `dashboards.read`. Anonymous campaign totals.
- GET `/campaigns/:campaignId/communities/:communityId/dashboard` → community/group subtree; TREE still reflects the campaign aggregate.

Notifications (in-app inbox plus reminder scheduling; SMS/push stay behind env-selected `dev`/`noop` interfaces; email uses `SmtpEmailTransport` via `nodemailer` when `SMTP_HOST` is set, otherwise the log-only `dev` transport; auth activation/reset use NotificationSender → email transport with `PUBLIC_WEB_BASE_URL` links):
- GET `/notifications?customerId=` → requires `notifications.read`. Own inbox only, newest first.
- GET `/notifications/:notificationId?customerId=` → requires `notifications.read`
- POST `/notifications/:notificationId/read?customerId=` → requires `notifications.update`. Own row only.
- GET/PUT `/me/notification-preferences` `{ inAppEnabled?, emailEnabled?, smsEnabled?, pushEnabled?, remindersEnabled?, reminderLocalTime? }` — user-level opt-out. SMS and push default off. Daily action reminders default on at `09:00` in the user timezone (campaign timezone if unset).
- Campaign events that notify enrolled participants: `campaign_started` on start, `milestone_achieved` on the first evaluation that crosses, `action_reminder` once per campaign-local day when no approved action exists after the local reminder time. Activation and password-reset messages are unchanged transactional auth mail and ignore campaign opt-out.

Localization (MVP languages are `en` and `zh-Hans`; Malay is not in the MVP):
- PATCH `/me` `{ locale?: 'en' | 'zh-Hans', timezone?: IANA }` — user locale preference used for notification templates.
- GET `/locales` and GET `/translations?locale=&namespace?` — JWT required. Templates are also stored in `translations`.

Reporting (reuses Phase 6/7 aggregate privacy: no private individual rows in campaign/community reports, no rankings; contact PII is never exported):
- GET `/participations/:participationId/report` → requires `reports.read`. Members see only their own.
- GET `/campaigns/:campaignId/report` and `/campaigns/:campaignId/communities/:communityId/report` → anonymous aggregates.
- GET `.../report/export` → `text/csv`; requires `reports.export`. Structured log `report_exported`. Campaign/community CSV omit `userId` and `participationId`.

Authorization must enforce authentication, tenant scope, permission, community scope, privacy and ownership where applicable. Never trust client-supplied tenantId.
