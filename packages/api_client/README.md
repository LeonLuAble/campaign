# API client

Typed Dart HTTP client for the Community Campaign API. Request and response shapes match `packages/api-contracts`. Business rules stay in `apps/api`.

- Base URL is supplied by the app (`API_BASE_URL`).
- Access tokens are attached as `Authorization: Bearer`.
- `Accept-Language` is `en` or `zh-Hans`.
- Expired access tokens trigger `POST /auth/refresh`. `TOKEN_REUSED` clears storage and signs the user out.
- `MemoryTokenStore` is for tests. Production apps use `SecureTokenStore`.
