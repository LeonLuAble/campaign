# Docker

Local PostgreSQL and Redis are defined in the repository root `docker-compose.yml`.

The API runs on the host, outside Docker, so `nest start --watch` and the debugger stay fast.

```sh
docker compose up -d --wait
```

Or use `infrastructure/scripts/dev-up.sh`.
