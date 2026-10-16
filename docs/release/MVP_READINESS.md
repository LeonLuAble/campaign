# MVP readiness

Audit of `docs/product/MVP_SPECIFICATION.md` against the repository after Phase 9. Status is **done**, **partial**, or **missing**. Evidence points at the implementing module or the test that proves the behavior.

The API MVP for Tzu Chi Malaysia's 速素数数 is **feature-complete**. Remaining **missing** and some **partial** items are listed rather than built: they need a product or operations decision, or they are larger than a release-hardening pass.

## Included checklist

| Item | Status | Evidence |
|------|--------|----------|
| Authentication and identity | done | `apps/api/src/modules/identity`, `apps/api/src/modules/auth`; `apps/api/test/auth.e2e-spec.ts`, `auth-account.e2e-spec.ts` |
| Email/mobile password login | done | `apps/api/src/modules/auth/application/auth.service.ts`; `apps/api/test/auth.e2e-spec.ts` |
| Google/Apple auth boundary | done | `apps/api/src/modules/auth/infrastructure/*-id-token.verifier.ts`; `apps/api/test/auth-social.e2e-spec.ts`. Production requires `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` (human IDs). |
| Activation / password reset / refresh tokens | done | `apps/api/src/modules/auth/application/registration.service.ts`, `password-reset.service.ts`, `token.service.ts`; `apps/api/test/auth-account.e2e-spec.ts`, `auth.e2e-spec.ts` |
| Customer / tenant | done | `apps/api/src/modules/customers`; `apps/api/test/customers.e2e-spec.ts`. DB table is `tenants`; API uses customers. |
| Arbitrary-depth communities | done | `apps/api/src/modules/communities`; `apps/api/test/customers.e2e-spec.ts`, `progress-milestones.e2e-spec.ts` |
| Membership, roles, permissions | done | `apps/api/src/modules/memberships`, `authorization`; `apps/api/test/customers.e2e-spec.ts`. F1 / F-SEC-1: system `member` role uses an explicit allow-list (no `memberships.read`, `roles.read`, `user_imports.read`); additive migration `1792866113000-TightenMemberRolePermissions`; `apps/api/test/member-role-permissions.e2e-spec.ts`. |
| Tags | missing | No `tags` / `user_tags` tables, APIs, or tests. Roles grant permissions; tags were specified as descriptive only. Larger than a release fix. |
| CSV user import (upload → mapping → validate → preview → confirm → result) | done | `apps/api/src/modules/user-imports`; `apps/api/test/user-imports.e2e-spec.ts`, `apps/api/test/mvp-journey.e2e-spec.ts` |
| Idempotent matching: external_id → email → mobile → manual review | done | `apps/api/src/modules/user-imports/application/import-match.ts`; `apps/api/test/user-imports.e2e-spec.ts` |
| Invitation / activation | done | Import confirm sends activation via `NotificationSender`; `POST /auth/activate`. No `/invitations` resource (by design in API_SPEC). |
| Campaign template / scope / configuration / lifecycle | done | `apps/api/src/modules/campaigns`; `apps/api/test/campaigns.e2e-spec.ts`, `mvp-journey.e2e-spec.ts` |
| Seven vegetarian choices | done | `apps/api/src/modules/vegetarian/application/vegetarian-rules.ts`; `apps/api/test/commitments-actions.e2e-spec.ts` |
| Participation and commitment | done | `apps/api/src/modules/participation`, `commitments`; `apps/api/test/campaigns.e2e-spec.ts`, `commitments-actions.e2e-spec.ts` |
| Action definitions, actions, submissions (`auto` / `manual` review) | done | `apps/api/src/modules/actions`; `apps/api/test/commitments-actions.e2e-spec.ts`. Auto-approved self-records set `reviewedAt` with a null reviewer; admins can reject. |
| Goals | partial | No `/goals` resource or `goals` table. Participant targets are **commitments** (`docs/api/API_SPEC.md`). Dedicated goals remain unspecified for a later phase. |
| Achievements, progress, completion | done | Computed on read from approved, non-cancelled actions. `apps/api/src/modules/progress`; `apps/api/test/progress-milestones.e2e-spec.ts`. Completion is `achieved/target*100` and is not capped. |
| Milestones and evaluation | done | `apps/api/src/modules/milestones`; `apps/api/test/progress-milestones.e2e-spec.ts`. Evaluations are append-only. |
| Measurement, versioned impact factors, outcomes | done | `apps/api/src/modules/measurements`, `outcomes`; `apps/api/test/measurements-outcomes.e2e-spec.ts`. No platform-default factor values. |
| TREE visualization | done | Generic `tree` type; display name 素心树 is settings. `apps/api/src/modules/visualizations`; `apps/api/test/measurements-outcomes.e2e-spec.ts` |
| Notifications | done | In-app inbox, campaign-started, first-cross milestone, daily action reminders. `apps/api/src/modules/notifications`; `apps/api/test/notifications.e2e-spec.ts`, `mvp-journey.e2e-spec.ts` |
| Flutter HTTP wiring | done | Shared client `packages/api_client` (JWT access/refresh, `TOKEN_REUSED` logout, `zh-Hans` Accept-Language, error envelope). Mobile: login/activation/reset, campaigns, self-join, pledge from `GET /campaigns/:id/commitment-options`, meal record/cancel, progress, dashboard + TREE, notifications, preferences. Admin: customers/communities, CSV import, campaign create/publish/start, participants, submission reject, impact factors, dashboards, report CSV export. Widget tests use `FakeCampaignApiClient`. |
| English + Simplified Chinese | done | API locales `en` and `zh-Hans` (`apps/api/src/modules/localization`, `apps/api/test/localization.e2e-spec.ts`). Flutter ARB files use `en` and `zh_Hans`; clients send `zh-Hans` (`packages/api_client`, `apps/mobile/lib/l10n`, `apps/admin/lib/l10n`). Server still maps `zh*` → `zh-Hans`. Malay is out of MVP. |
| Privacy | partial | Privacy levels are stored on actions (default `private`) (`apps/api/src/modules/actions/domain/action.entity.ts`). Member list visibility is still self-scoped; privacy does not expand or restrict admin/member reads beyond that. F1 removes member access to import rows and membership/role directories so members cannot read other users' email, mobile, or raw CSV. |
| Audit | partial | Structured `report_exported` logs (`apps/api/src/modules/reports/application/report.service.ts`). No `audit_logs` table or dedicated audit module. Sensitive auth/import/campaign operations log structured events without secrets. |
| Participant / group / community / campaign dashboards | done | API: `apps/api/src/modules/visualizations/application/dashboard.service.ts`; `apps/api/test/measurements-outcomes.e2e-spec.ts`. Flutter mobile and admin dashboards load these payloads over HTTP (`apps/mobile`, `apps/admin`). |
| Reports and CSV export without contact PII | done | `apps/api/src/modules/reports`; `apps/api/test/reports.e2e-spec.ts`, `mvp-journey.e2e-spec.ts` |

## Key requirements

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Tenant isolation | done | `apps/api/test/tenant-isolation.e2e-spec.ts`, `mvp-journey.e2e-spec.ts` |
| Backend authorization | done | `PermissionsGuard`, `TenantScopeGuard`; permission catalog in `apps/api/src/modules/authorization`; member allow-list in `MEMBER_PERMISSION_KEYS` |
| UTC timestamps | done | `timestamptz` columns in TypeORM migrations under `apps/api/src/platform/database/migrations` |
| PostgreSQL migrations; no ORM auto-sync | done | `synchronize: false`, `migrationsRun: false` in `apps/api/src/platform/database/database-options.ts` |
| Historical actions/outcomes preserved | done | Cancel sets `status=cancelled`; reject changes submission status; rows are not deleted. Progress/outcomes recompute on read. |
| Tests for business rules, authorization, imports | done | Unit specs under `apps/api/src/**/*.spec.ts`; e2e under `apps/api/test/*.e2e-spec.ts` including `mvp-journey.e2e-spec.ts` |

## DATABASE.md tables vs implementation

Projection tables listed in `docs/architecture/DATABASE.md` that are **intentionally absent** (computed on read): `progress_records`, `achievements`, `measurements`, `outcomes`.

Tables listed there that are **not implemented** (larger gaps): `tags`, `user_tags`, `invitations`, `goals`, `audit_logs`, `files`. Optional/future: `outbox_events`, `processed_events`.

Object storage env vars exist; no `files` module uploads yet. CSV import stores content in PostgreSQL.

## Phase 9 release work in this pass

| Work | Status | Evidence |
|------|--------|----------|
| Full API e2e MVP journey | done | `apps/api/test/mvp-journey.e2e-spec.ts` |
| Auth rate limiting | done | `@nestjs/throttler` on `AuthController`; `apps/api/test/security.e2e-spec.ts` |
| Helmet + CORS via env | done | `apps/api/src/bootstrap/configure-app.ts`; `CORS_ORIGINS`, `HELMET_ENABLED` |
| No secrets/tokens in logs | done | `LOGGER_REDACT_PATHS`; `DevNotificationSender` never logs raw tokens |
| Production env validation | done | `apps/api/src/config/env.schema.ts` (Google/Apple IDs, non-example JWT secrets, SMTP host/from when provider is `smtp`) |
| npm audit (high/critical) | done | `npm audit` on `apps/api` at Phase 9: **0 vulnerabilities** |
| Demo seed (dev-only, idempotent, no real PII) | done | `apps/api/src/scripts/seed-demo.ts`; `npm run seed:demo` |
| Production API Dockerfile | done | `apps/api/Dockerfile` |
| Deployment checklist | done | `docs/release/DEPLOYMENT.md` |

## Larger gaps (not built)

1. **Native Google/Apple SDKs** are not bundled. Sign-in buttons stay hidden unless `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` dart-defines are set; production still needs the platform plugins and human-issued client IDs.
2. **Tags** (descriptive attributes that never grant permissions).
3. **Dedicated goals resource** (commitments cover participant targets).
4. **`audit_logs` table** and query API (export currently uses structured logs).
5. **Invitations as a first-class resource** (activation tokens cover the MVP path).
6. **Files / object storage** for uploaded artifacts (CSV import is in-database).
7. **Real SMTP/SMS/push delivery.** `smtp` / `dev` / `noop` transports log or skip; they do not send provider traffic. Choosing vendors is a human decision (`docs/release/DEPLOYMENT.md`).
8. **Privacy-level visibility expansion** (GROUP/COMMUNITY/CUSTOMER/PUBLIC sharing rules).
9. **Impact factor numeric values and citations for production** must be supplied by the tenant; nothing is hardcoded.
10. **Hosting, DNS, TLS, backups, and observability backends** are not chosen in this repository.

## Excluded from MVP (unchanged)

Other campaign UI, template builder, billing/payment, runtime AI, marketplace, advanced social feed/gamification, advanced verification, enterprise SSO, advanced BI, third-party integrations, public API marketplace.
