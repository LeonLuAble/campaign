# API contracts

This package is the place for shared API request and response types used by more than one client.

The NestJS API in `apps/api` remains authoritative for business logic. Do not duplicate domain models, persistence entities, or workflow rules into this package.

Phase 0 has no business endpoints yet, so the package only establishes the boundary. Add a contract when mobile or admin needs a stable type for an endpoint that already exists on the backend.
