# Domain Model
Core distinctions:
- Platform: reusable capability.
- Customer: business/client concept.
- Tenant: database/system isolation concept.
- Community: organization hierarchy inside a tenant.
- Campaign: concrete initiative.
- Campaign Template: reusable blueprint.
- Campaign Configuration: concrete campaign rules.
- Campaign Scope: subject/domain within a template.
- Action Definition: what can be done.
- Action: what was done.
- Submission: reporting/verification.
- Measurement: quantified measurement.
- Outcome: generic measurable result.
- Impact Factor: versioned, source-attributed factor.
- Commitment: intention/target.
- Goal: desired target.
- Achievement: actual result.
- Progress: target versus achievement.
- Milestone: stage target/evaluation; never resets history.
- Participation: joining a campaign.
- Membership: user relationship with tenant/community.
- Role: permission-bearing capability.
- Tag: descriptive attribute; never grants permission.
- Visualization: generic display type.

Customer vs Tenant:
- API/UI may use Customer/customerId.
- DB/internal code uses tenants/tenant_id/TenantContext.
- MVP has one `tenants` table, not both customers and tenants.

Identity:
User -> identities (email/mobile/social) + credentials.
Support email/password, mobile/password, Google, Apple.
Do not put googleId/appleId/password_hash directly on users.
Social uniqueness: `(provider, provider_subject)`.
Do not auto-merge accounts merely because emails match.

Community:
Use arbitrary-depth `community_nodes(parent_id)`.
Do not put direct community_id on users.
Use User <-> Membership <-> Tenant/Community.

Campaign:
Template -> Scope -> Campaign -> Configuration.
MVP template=Environmental Action, scope=Vegetarian, campaign=速素数数.

Action -> Measurement -> Outcome.
Impact factors are data-driven, versioned, source-attributed and effective-date aware.
