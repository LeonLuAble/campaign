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
- POST /user-imports/:userImportId/confirm → create identities/memberships and send activation invitations
- GET /user-imports, GET /user-imports/:userImportId, GET /user-imports/:userImportId/rows → list/summary/result errors

Imported users activate through POST /auth/activate with a password. Invitation delivery reuses the existing activation token + NotificationSender path (no `/invitations` resource in this phase).

Campaign:
- `/campaign-templates`
- `/campaign-scopes`
- `/campaigns`
- publish/start/complete
- configuration
- target communities

Participation:
- `/campaigns/{id}/participations`
- `/participations/{id}`

Actions:
- action definitions
- POST `/actions`
- list/get/cancel
- submissions approve/reject

Commitments: `/participations/{id}/commitments`
Goals: `/goals`
Achievements: campaign/participant endpoints
Progress: participant/community/campaign endpoints
Milestones: create/list/progress/evaluate/evaluations
Measurement/Outcome/Impact: definitions, measurements, factors, outcomes
Visualization: campaign visualization and data
Dashboards/reports: participant/group/community/campaign
Notifications, localization, audit.

Authorization must enforce authentication, tenant scope, permission, community scope, privacy and ownership where applicable. Never trust client-supplied tenantId.
