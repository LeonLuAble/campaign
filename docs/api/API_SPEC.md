# API Specification
Base: `/api/v1`; REST/JSON; camelCase JSON; UUIDs; ISO timestamps; stable error codes.

Auth:
- POST /auth/register (identifier=email or mobile + password) → 201 `{ id, identifier, type }`
- POST /auth/login (identifier=email or mobile + password)
- POST /auth/social (Google/Apple)
- POST /auth/refresh
- POST /auth/logout
- GET /me
- POST /auth/activate `{ token }` → 204; idempotent if already verified
- POST /auth/activate/resend `{ identifier }` → 202 `{ accepted: true }`
- POST /auth/password-reset/request `{ identifier }` → 202 `{ accepted: true }` (no enumeration)
- POST /auth/password-reset/confirm `{ token, password }` → 204

Auth error codes include `INVALID_CREDENTIALS`, `TOKEN_INVALID`, `TOKEN_REUSED`, `TOKEN_EXPIRED`, `IDENTITY_ALREADY_EXISTS`, and `WEAK_PASSWORD`.
Password policy: minimum 8 characters (configurable via `PASSWORD_MIN_LENGTH`).

Customer: `/customers`
Communities: `/communities`
Membership/roles/permissions: `/memberships`, `/roles`, `/permissions`

User import: `/user-imports` with file upload, mapping, validate, preview, confirm, result/errors.
Invitations: `/invitations`

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
