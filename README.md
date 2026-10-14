# Community Campaign Platform

Community Campaign Platform is a modular monolith for running community campaigns. The first customer is Tzu Chi Malaysia; the first campaign is 速素数数.

The API MVP (Phases 0–9) is implemented: identity and auth, customers/communities/memberships, CSV user import, campaigns, vegetarian commitments and meal recording, progress, measurements and TREE visualization, notifications, localization (`en` / `zh-Hans`), and reports. Flutter mobile and Flutter web admin talk to that API through a shared typed client in `packages/api_client`.

Business rules stay in the backend. Flutter renders payloads, validates format, and maps the API error envelope to localized copy.

## Technology stack

- Backend: NestJS and TypeScript (one API, one PostgreSQL database, one Redis instance)
- Shared HTTP client: Dart (`packages/api_client`)
- Mobile: Flutter and Dart
- Admin web: Flutter web
- Database: PostgreSQL
- Cache and jobs: Redis
- Object storage: S3-compatible, reserved (CSV import is stored in PostgreSQL)
- API: REST and JSON under `/api/v1`
- Local infrastructure: Docker Compose for PostgreSQL and Redis only

## Repository structure

```text
apps/api                 NestJS API
apps/mobile              Flutter participant app
apps/admin               Flutter web admin
packages/api-contracts   Shared request/response types (TypeScript)
packages/api_client      Typed Dart HTTP client (JWT, locale, errors)
docs                     Product and architecture notes
infrastructure           Local Docker helpers
```

The API source layout is `config`, `bootstrap`, `modules`, `platform`, and `shared`.

## Architecture documentation

Product vision, domain model, architecture, and development guides are in the `docs/` directory:

- `docs/product/PRODUCT_VISION.md`
- `docs/product/DOMAIN_MODEL.md`
- `docs/product/MVP_SPECIFICATION.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/PROJECT_STRUCTURE.md`
- `docs/architecture/DATABASE.md`
- `docs/api/API_SPEC.md`
- `docs/development/CURSOR_DEVELOPMENT_GUIDE.md`
- `docs/AI_HANDOVER.md`
- `docs/release/MVP_READINESS.md`
- `docs/release/DEPLOYMENT.md`

Working constraints and conventions are in `.cursor/rules/`.

## Prerequisites

- macOS with Homebrew (or equivalent) is the supported local workstation
- Node.js 22.23 or newer (see `.nvmrc`). The API build requires Node 22.23+ due to nest-cli; Node 22.12 and Node 20 produce module cycle errors.
- npm
- Docker Desktop with Docker Compose (PostgreSQL and Redis only)
- Flutter stable (this workspace was bootstrapped with Flutter 3.47 / Dart 3.13)
- Xcode + iOS Simulator for the mobile app on iOS, and/or Android Studio + an emulator
- Chrome for the admin web app

## Run locally on macOS

The API runs on your machine, not in Docker, so reload and debugging stay fast. Docker is only for PostgreSQL and Redis.

### 1. Clone and copy env

```sh
cp .env.example .env
```

The database user, password, and database name in `.env.example` are local development placeholders.

### 2. Start PostgreSQL and Redis

From the repository root:

```sh
docker compose up -d --wait
```

`infrastructure/scripts/dev-up.sh` does the same compose start. `infrastructure/scripts/dev-down.sh` stops it.

PostgreSQL listens on `localhost:5432` and Redis on `localhost:6379`.

### 3. Install API dependencies, migrate, and seed demo data

Use Node 22 from `.nvmrc` before installing. Node 20 fails on the Nest CLI and on native modules such as `argon2` with the macOS 27 SDK.

```sh
cd apps/api
nvm use
npm install
npm run migration:run
npm run seed:demo
```

`seed:demo` is idempotent, refuses `NODE_ENV=production`, and prints invented `@example.test` logins at the end. The values it prints are:

| Role | Email | Password |
|------|-------|----------|
| Platform / tenant admin | `demo.admin@example.test` | `DemoPassw0rd!` |
| Sample member | `alex.tan@example.test` | `DemoPassw0rd!` |

Use the admin account in the Flutter web admin. Use a member account in the mobile app. Do not treat these identities as real people.

### 4. Start the API

```sh
cd apps/api
npm run start:dev
```

If `argon2` still fails to compile after switching Node versions, install with the macOS 26 SDK:

```sh
SDKROOT=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX26.sdk npm install
```

The API reads `.env` from `apps/api/.env` and then the repository root `.env`.

- Liveness: `GET http://localhost:3000/api/v1/health`
- Infrastructure readiness: `GET http://localhost:3000/api/v1/health/ready`

Liveness stays available when a dependency is down. Readiness reports `database` and `redis` as `up` or `down` and does not return connection details.

Schema changes use TypeORM migrations. Automatic schema synchronization is disabled.

```sh
cd apps/api
npm run migration:show
npm run migration:run
```

### 5. Run admin web (Chrome)

```sh
cd apps/admin
flutter pub get
flutter run -d chrome --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

Sign in with `demo.admin@example.test` / `DemoPassw0rd!`.

### 6. Run the mobile participant app

iOS Simulator (localhost is the Mac):

```sh
cd apps/mobile
flutter pub get
flutter run -d ios --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

Android emulator — use `10.0.2.2`, not `localhost`. `localhost` inside the emulator is the emulator itself, so the API on the host will not be reached:

```sh
cd apps/mobile
flutter pub get
flutter run -d android --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Sign in with `alex.tan@example.test` / `DemoPassw0rd!`.

Supported locales are English and Simplified Chinese (`en`, `zh-Hans`). The apps expose an in-app language preference; English is the template. Malay is not in the MVP.

Google/Apple sign-in buttons stay hidden unless `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` dart-defines are set. Native social SDKs are not bundled.

Production API image: `docker build -t campaign-api ./apps/api`. Release checklist: `docs/release/DEPLOYMENT.md`. MVP audit: `docs/release/MVP_READINESS.md`.

## Tests

Backend unit tests and lint do not need Docker. The e2e test starts the API and checks PostgreSQL and Redis, so start Compose first.

```sh
cd apps/api
npm test
npm run test:e2e
npm run lint
npm run build
```

```sh
cd packages/api_client
flutter analyze
flutter test
```

```sh
cd apps/mobile
flutter analyze
flutter test
```

```sh
cd apps/admin
flutter analyze
flutter test
```

## Code quality

The API uses TypeScript strict mode, ESLint, and Prettier. Flutter apps use the Flutter analyzer and `flutter_lints`. Format Dart with `dart format`.
