# API Specification
Base: `/api/v1`; REST/JSON; camelCase JSON; UUIDs; ISO timestamps; stable error codes.

Auth:
- POST /auth/login (identifier=email or mobile + password)
- POST /auth/social (Google/Apple)
- POST /auth/refresh
- POST /auth/logout
- GET /me
- POST /auth/activate
- password reset endpoints

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
