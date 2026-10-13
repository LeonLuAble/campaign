# Cursor Development Guide
Cursor accelerates implementation; it is not the architecture authority.

Before a significant task read all canonical MD files and inspect the actual repository.

Rules:
- understand before editing.
- make small verifiable changes.
- preserve module boundaries.
- business rules belong in backend.
- do not guess critical rules.
- no speculative infrastructure.
- run tests/build/lint.
- report incomplete work honestly.

Phase order:
0. Repository/environment.
1. Identity/authentication.
2. Customer/community/membership/authorization.
3. User import/activation.
4. Campaign foundation.
5. Commitment/action recording.
6. Achievement/progress/milestones.
7. Measurement/outcome/visualization.
8. Notifications/localization/reporting.
9. End-to-end validation/MVP release.

Phase 0 must establish repository, NestJS bootstrap, health endpoint, env config, PostgreSQL/Redis connectivity, logging, correlation ID, validation, error handling, migration infrastructure, Docker Compose, Flutter shells, API contracts, Cursor rules, .env.example, tests and README. Do not start business modules.

Cursor prompt pattern:
1. Read canonical docs.
2. Inspect current implementation.
3. Explain affected modules/files.
4. Identify ambiguity.
5. Implement smallest complete change.
6. Add/update tests and migrations.
7. Run verification.
8. Report files, tests, limitations and architecture compliance.

Definition of done:
- correct module ownership
- migration if schema changes
- API contract if API changes
- tests
- validation
- authorization
- error handling
- audit/logging where relevant
- documentation when behavior changes
- successful verification

Escalate when architecture, identity, tenant model, destructive migrations, privacy, authorization, major infrastructure or MVP scope would change.
