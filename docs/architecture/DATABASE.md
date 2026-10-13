# Database Specification
PostgreSQL is the source of truth. UUIDs, snake_case, UTC timestamps, FKs, unique/check constraints, migrations mandatory.

Core tables:
`tenants`
`users`
`user_identities`
`user_credentials`
`user_social_identities`
`refresh_tokens`
`community_nodes`
`memberships`
`roles`
`permissions`
`role_permissions`
`membership_roles`
`tags`
`user_tags`
`user_imports`
`user_import_rows`
`invitations`
`campaign_templates`
`campaign_scopes`
`campaigns`
`campaign_configurations`
`campaign_communities`
`participations`
`action_definitions`
`actions`
`submissions`
`commitments`
`goals`
`achievements`
`progress_records`
`milestones`
`milestone_progress`
`milestone_evaluations`
`measurement_definitions`
`measurements`
`impact_factors`
`outcomes`
`visualizations`
`notifications`
`notification_deliveries`
`translations`
`audit_logs`
`files`

Future/optional: `outbox_events`, `processed_events`.

Rules:
- no customers table duplicating tenants.
- no password_hash/googleId/appleId on users.
- social identity UNIQUE(provider, provider_subject).
- historical outcomes retain factor version used.
- imports must be idempotent.
- index tenant scope, FKs, identity lookup, campaign/participation, dates and reporting dimensions.
- preserve historical actions/outcomes.
- soft delete only where justified.
