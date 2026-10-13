# Community Campaign Platform

Community Campaign Platform is a modular monolith for running community campaigns. This repository is the Phase 0 development foundation: an API shell, a Flutter mobile shell, a Flutter web admin shell, and local PostgreSQL and Redis.

Business features such as users, authentication, campaigns, actions, progress, and outcomes are not implemented yet.

## Technology stack

- Backend: NestJS and TypeScript
- Mobile: Flutter and Dart
- Admin web: Flutter web
- Database: PostgreSQL
- Cache and future jobs: Redis
- Object storage: S3-compatible, configured later
- API: REST and JSON under `/api/v1`
- Local infrastructure: Docker Compose

## Repository structure

```text
apps/api                 NestJS API
apps/mobile              Flutter mobile shell
apps/admin               Flutter web admin shell
packages/api-contracts   Shared API contracts (backend stays authoritative)
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

Working constraints and conventions are in `.cursor/rules/`.

## Prerequisites

- Node.js 22.23 or newer (see `.nvmrc`). The API build requires Node 22.23+ due to compatibility with nest-cli dependencies; Node 22.12 and Node 20 produce module cycle errors.
- npm
- Docker with Docker Compose
- Flutter stable (this workspace was bootstrapped with Flutter 3.47 / Dart 3.13)

## Start PostgreSQL and Redis

From the repository root:

```sh
cp .env.example .env
docker compose up -d --wait
```

`infrastructure/scripts/dev-up.sh` does the same compose start. `infrastructure/scripts/dev-down.sh` stops it.

PostgreSQL listens on `localhost:5432` and Redis on `localhost:6379`. The database user, password, and database name in `.env.example` are local development placeholders.

The API runs on your machine, not in Docker, so reload and debugging stay fast.

## Start the backend

```sh
cd apps/api
npm install
npm run start:dev
```

The API reads `.env` from `apps/api/.env` and then the repository root `.env`.

- Liveness: `GET http://localhost:3000/api/v1/health`
- Infrastructure readiness: `GET http://localhost:3000/api/v1/health/ready`

Liveness stays available when a dependency is down. Readiness reports `database` and `redis` as `up` or `down` and does not return connection details.

Schema changes use TypeORM migrations. Automatic schema synchronization is disabled. There is no business schema in Phase 0. When migrations exist:

```sh
cd apps/api
npm run migration:show
npm run migration:run
```

## Start mobile

```sh
cd apps/mobile
flutter pub get
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

Supported locales are English and Simplified Chinese (`en`, `zh-Hans`). The apps expose an in-app language preference; English is the template. Malay is not in the MVP.

## Start admin web

```sh
cd apps/admin
flutter pub get
flutter run -d chrome --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

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
