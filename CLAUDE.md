# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Resttek: restaurant management platform. npm-workspaces monorepo (`packages/*`) with one Express API and three Angular 21 apps plus a shared Angular library. Project docs are in Spanish under `docs/` (architecture, domain glossary, data model); read them for detail.

## Commands

Run from the repo root (Node 22+, npm 10+):

```bash
npm install                # installs all workspaces
npm run seed               # populate SQLite with test data (idempotent, INSERT OR IGNORE)
npm run dev:api            # API on :3000 (tsx watch); health check: GET /health
npm run dev:admin          # web-admin on :4200
npm run dev:empleados      # web-empleados on :4201
npm run dev:clientes       # web-clientes on :4202
npm test                   # API tests (vitest run) — the only tests wired up at root
```

- Single test file / name: `cd packages/api && npx vitest run src/services/order.service.test.ts` or `npx vitest run -t "test name"`. Watch mode: `npm run test:watch` in `packages/api`.
- Frontends: `npm run build -w @resttek/web-admin` (same for the others). No lint script exists, and the frontends have no test script at the root.
- Seeded users: password equals the email (e.g. `admin@resttek.com`); full list in README.md.

## Architecture

**API (`packages/api`, ESM, strict TS, SQLite via `sqlite3`)** mixes two styles:
- `src/contexts/employee/` is hexagonal/DDD (domain → application use cases → infrastructure with HTTP controllers, Sqlite repo, Bcrypt auth). Shared pieces (Email value object, `errorHandler`, auth `middlewares`) live in `src/contexts/shared/`.
- `restaurant`, `dish`, `ingredient`, `order` use flat layered folders: `routes/ → controllers/ → services/ → repositories/`, with `models/`. Repository mocks in `repositories/mocks/` are used by service unit tests.
- All routes are mounted in `src/app.ts` under `/api/v1/...`; public (unauthenticated) routes are under `/api/v1/public/...`. Nested resources hang off `/restaurants/:restaurantId/...`. Errors flow through `AppError`/`DomainErrors` to the central `errorHandler`.
- Path aliases (`@employee/*`, `@shared/*`, `@services/*`, `@repositories/*`, `@errors/*`, etc.) are defined in `packages/api/tsconfig.json` and resolved in vitest by `vite-tsconfig-paths`. Imports use the `.js` extension (nodenext).
- DB: `src/config/database.ts` creates tables on startup (migrations in code). File is `packages/api/resttek.db`; `NODE_ENV=test` uses `:memory:`.
- Auth: JWT; `authenticate` middleware verifies the token, `authorize` checks roles.

**Frontends**: Angular standalone components + signals. `web-admin` and `web-empleados` organize by feature (`models/ pages/ services/ store/`); `web-clientes` centralizes models/services in `core/`. Each has a `proxy.conf.json` forwarding `/api` to `localhost:3000` (use the frontend port, not 3000 directly).

**`@resttek/web-shared`** (`main: src/index.ts`, consumed as TS source, not built): auth service/store/guard, auth and error HTTP interceptors, login and register components, injection tokens. Frontends depend only on it, never on each other. After changing it, restart the frontend dev server (changes aren't picked up automatically).

## Other

- `scripts/seed-issues.sh` creates GitHub issues from `scripts/issues.json` (needs `gh` and `jq`); see `scripts/README.md`.
- `docs/revisiones/` lists known mismatches between the docs and the code; check there before trusting the docs on a disputed detail.
