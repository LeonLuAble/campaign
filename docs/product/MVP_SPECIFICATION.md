# MVP Specification
## Included
- Authentication and identity.
- Email/mobile password login.
- Google/Apple auth boundary.
- Activation/password reset/refresh tokens.
- Customer/tenant.
- Arbitrary-depth communities.
- Membership, roles, permissions, tags.
- CSV user import with upload -> mapping -> validation -> preview -> confirm -> result.
- Idempotent matching: external_id -> email -> mobile -> manual review.
- Invitation/activation.
- Campaign template/scope/configuration/lifecycle.
- Seven vegetarian choices.
- Participation and commitment.
- Action definitions, actions and submissions. Campaign `submissionReview` is `auto` (default) or `manual`; auto-approved self-records do not require per-action admin review. Advanced verification is out of scope.
- Goals, achievements, progress and completion. Progress counts only approved submissions on non-cancelled actions.
- Milestones and evaluation.
- Measurement, versioned impact factors and outcomes.
- TREE visualization.
- Notifications.
- English + Simplified Chinese.
- Privacy and audit.
- Basic participant/group/community/campaign dashboards and reports.

## Excluded
Other campaign UI, template builder, billing/payment, runtime AI, marketplace, advanced social feed/gamification, advanced verification, enterprise SSO, advanced BI, third-party integrations, public API marketplace.

## Key requirements
- Tenant isolation.
- Backend authorization.
- UTC timestamps.
- PostgreSQL migrations; no ORM auto-sync in production.
- Historical actions/outcomes preserved.
- Tests for business rules, authorization and imports.
