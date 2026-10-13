# Deployment checklist

This is an operations checklist for running the Community Campaign Platform API. It does **not** choose a cloud provider, region, Kubernetes distribution, or managed database product. Those are human decisions.

Do not apply Terraform or other cloud infrastructure from this phase. Local PostgreSQL and Redis remain in the repository root `docker-compose.yml`.

## Container image

A production image for the API is defined at `apps/api/Dockerfile`.

```sh
docker build -t campaign-api ./apps/api
```

The image runs `node dist/main.js` as a non-root user and expects configuration through environment variables. It does not start PostgreSQL or Redis. Do not run `npm run seed:demo` against a production database.

## Required environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | yes | Must be `production` for a production process. |
| `PORT` | no | Default `3000`. |
| `DATABASE_URL` | yes | `postgresql://` URL. Do not return this value from the API. |
| `REDIS_URL` | yes | `redis://` or `rediss://`. |
| `JWT_ACCESS_SECRET` | yes | ≥32 characters. Example/dev/test secrets are rejected in production. |
| `JWT_REFRESH_SECRET` | yes | ≥32 characters. Distinct from the access secret. |
| `JWT_ACCESS_TTL_SECONDS` | no | Default `900`. |
| `JWT_REFRESH_TTL_SECONDS` | no | Default `604800`. |
| `JWT_ISSUER` | no | Default `campaign-api`. |
| `JWT_AUDIENCE` | no | Default `campaign-clients`. |
| `ACTIVATION_TOKEN_TTL_SECONDS` | no | Default `86400`. |
| `PASSWORD_RESET_TOKEN_TTL_SECONDS` | no | Default `3600`. |
| `PASSWORD_MIN_LENGTH` | no | Default `8`. |
| `DEFAULT_PHONE_REGION` | no | Default `MY`. |
| `GOOGLE_CLIENT_ID` | **yes in production** | OIDC audience for Google ID tokens. |
| `APPLE_CLIENT_ID` | **yes in production** | OIDC audience for Apple ID tokens. |
| `CORS_ORIGINS` | no | Comma-separated browser origins. Empty disables CORS. |
| `HELMET_ENABLED` | no | Default `true`. |
| `AUTH_RATE_LIMIT_ENABLED` | no | Default on outside `test`. Set `false` to disable. |
| `AUTH_RATE_LIMIT_TTL_SECONDS` | no | Default `60`. |
| `AUTH_RATE_LIMIT_MAX` | no | Default `20` auth requests per TTL per client. |
| `NOTIFICATION_EMAIL_PROVIDER` | no | `dev` (log only) or `smtp`. |
| `SMTP_HOST` | **yes if provider is `smtp`** | |
| `SMTP_FROM` | **yes if provider is `smtp`** | |
| `SMTP_PORT` | no | Default `587`. |
| `SMTP_USER` / `SMTP_PASSWORD` | no | Required by a real SMTP implementation when you add one. |
| `NOTIFICATION_SMS_PROVIDER` | no | `dev` or `noop`. |
| `NOTIFICATION_PUSH_PROVIDER` | no | `dev` or `noop`. |
| `SMS_FROM` | no | |
| `REMINDER_SCHEDULER_ENABLED` | no | Default `true`. |
| `REMINDER_SCHEDULER_INTERVAL_MS` | no | Default `60000`. |
| `OBJECT_STORAGE_*` | no | Reserved; file uploads are not implemented. |

See `.env.example` for local placeholders. Never commit production secrets.

## Migrations

Schema changes are additive TypeORM migrations. `synchronize` is false in every environment.

From `apps/api`, after a successful build:

```sh
npm run migration:show
npm run migration:run
```

Run migrations against the target database **before** serving production traffic. Do not edit already-merged migration files.

## Process checklist

1. Provision PostgreSQL 16 and Redis 7 (or compatible). Record connection URLs as secrets.
2. Set production JWT secrets that are not the values in `.env.example`.
3. Set Google and Apple client IDs, or delay social login until those apps exist.
4. Choose CORS origins for the admin web origin(s).
5. Run `migration:run`.
6. Start the API container or `node dist/main.js`.
7. Confirm `GET /api/v1/health` and `GET /api/v1/health/ready`.
8. Create the first platform admin through a controlled process (existing user + `users.is_platform_admin`, or a reviewed bootstrap). `npm run seed:tzu-chi` promotes an **existing** user and is not a production password factory.
9. Do **not** run `npm run seed:demo` in production.

## Needs human decision

These are not chosen in this repository:

- **Hosting** — where the API, PostgreSQL, Redis, and Flutter web/mobile artifacts run; DNS; TLS certificates; backups.
- **SMTP provider** — the `smtp` transport is an interface that currently logs rather than sending mail. Pick a vendor, credentials, and implement or replace `SmtpEmailTransport` before relying on email.
- **SMS provider** — `dev` / `noop` only. Pick a vendor if SMS activation or reminders are required.
- **Push provider** — `dev` / `noop` only.
- **Impact factor values and sources** — versioned factors must be entered per tenant with a citation. The platform does not ship numeric defaults. Tzu Chi Malaysia must approve values and sources for 速素数数.
- **Google and Apple client IDs** — create OAuth/OIDC apps and set `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID`.
- **Whether `NOTIFICATION_EMAIL_PROVIDER=dev` is acceptable** in a given environment (logs only; no real delivery).
- **Who the first platform admin is**, and how Tzu Chi Malaysia tenant-admins are named.

## Demo data (non-production)

From `apps/api`, with `NODE_ENV` not equal to `production`:

```sh
npm run seed:demo
```

This is idempotent, refuses production, and creates invented `@example.test` identities only. Default password is printed at the end of the script. Never load it with real member lists.
